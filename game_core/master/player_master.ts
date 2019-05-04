// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat, GamePhase, RuleEnums, ActionEnums } from "../enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG, Ability, IUpgrade } from "../interface";
import { GetterChain } from "../hook";
import { throwIfIsBackend, BadOperationError, throwDebugError } from "../errors";
import { SoftRule as SR, HardRule as HR, Constant as C, SoftRule } from "../general_rules";
import { TimeMaster } from "./time_master";
import { ActionChainFactory } from "./action_chain_factory";

function checkCardStat(arg: any | Array<any>, stat = CardStat.Onboard) {
    if(arg instanceof Array) {
        for(let c of arg) {
            if(!checkCardStat(c)) {
                return false;
            }
        }
        return true;
    } else {
        if(TG.isCard(arg)) {
            return arg.card_status == stat;
        }
        return true;
    }
}

export class PlayerMaster {
    public getAll<T extends ICard>(guard: (c: ICard) => c is T, filter: (c: T) => boolean) {
        let res = new Array<T>();
        for(let seq in this.card_table) {
            let c = this.card_table[seq];
            if(guard(c) && filter(c)) {
                res.push(c);
            }
        }
        return res;
    }
    public readonly card_table: { [index: number]: ICard } = {};

    private _mana = 0;
    private _emo = 0;
    private _char_quota = -1;

    public get mana() { return this._mana; };
    public get emo() { return this._emo; };
    public get char_quota() { return this._char_quota; };
    public get deck() { 
        return this.getAll(TG.isCard, c => c.card_status == CardStat.Deck);
    }
    public get hand() {
        return this.getAll(TG.isCard, c => c.card_status == CardStat.Hand);
    }
    public get characters() {
        return this.getAll(TG.isCharacter, c => c.card_status == CardStat.Onboard);
    }
    public get arenas() {
        return this.getAll(TG.isArena, c => c.card_status == CardStat.Onboard);
    }
    public get events_ongoing() {
        return this.getAll(TG.isEvent, c => c.card_status == CardStat.Onboard && !c.is_finished);
    }
    public get events_finished() {
        return this.getAll(TG.isEvent, c => c.card_status == CardStat.Onboard && c.is_finished);
    }

    constructor(private acf: ActionChainFactory, public readonly player: Player,
        private t_master: TimeMaster,
        private getMaster: (card: ICard | Player) => PlayerMaster,
    ) {
        let soft_rules = new SR(() => t_master.cur_phase);
        soft_rules.checkPlay(this.card_play_chain, () => this.char_quota);
        soft_rules.onGetBattleRole(this.get_battle_role_chain, this.getStrength.bind(this));
        soft_rules.checkPush(this.add_progress_chain);
        soft_rules.onFinish(this.finish_chain, this.retireCard.bind(this));
        soft_rules.onGetManaCost(this.get_mana_cost_chain, () => this.arenas);
        soft_rules.onGetEnterCost(this.get_enter_cost_chain);
        soft_rules.checkEnter(this.enter_chain);
        soft_rules.checkExploit(this.exploit_chain);
        soft_rules.onEnter(this.enter_chain, (p, mana) => {
            this.getMaster(p).addMana(mana);
        });
        // 理論上，當任務失敗，應該扣掉等同基礎開銷的魔力，多出來的話一比一變成情緒傷害。
        this.fail_chain.append(async evt => {
            let mana_cost = Math.min(this.mana, evt.basic_mana_cost);
            let emo_cost = evt.basic_mana_cost - mana_cost;
            await this.addMana(-mana_cost);
            await this.addEmo(emo_cost);
        }, undefined, RuleEnums.PunishOnFail);
        this.exploit_chain.append(({ char }) => {
            return {
                after_effect: async () => {
                    if(TG.isCard(char)) {
                        await this.exitArena(char);
                    }
                }
            };
        }, undefined, RuleEnums.ExitAfterExploit);
        this.check_before_play_chain.append((b, card) => {
            if(this.t_master.cur_phase == GamePhase.Setup) {
                return { var_arg: true, break_chain: true };
            } else if(card.can_play_phase.indexOf(GamePhase.Any) == -1
                && card.can_play_phase.indexOf(this.t_master.cur_phase) == -1
            ) {
                // 如果現在不是能打該牌的階段，就不讓他打
                return { var_arg: false };
            }
        }, undefined, RuleEnums.CheckPhaseBeforePlay)
        .append((b, card, nonce) => {
            if(this.mana < this.getManaCost(card, nonce)) {
                return { var_arg: false };
            }
        }, undefined, RuleEnums.CheckPriceBeforePlay)
        .append((b, card) => {
            if(TG.isCharacter(card) && this.char_quota == 0) {
                // 一回合打出的角色超過上限
                return { var_arg: false };
            }
        }, undefined, RuleEnums.CheckQuotaBeforePlayChar);

        t_master.start_building_chain.append(async () => {
            // 所有角色解除疲勞並離開場所
            for(let char of this.characters) {
                if(char.data.arena_entered) {
                    await this.exitArena(char);
                }
                await this.changeCharTired(char, false);
            }
            // 所有事件倒數減1
            for(let event of this.events_ongoing) {
                await this.addEventCountdown(event);
            }
            // 打角色的額度恢復
            this._char_quota = 1;
            // 抽牌
            await this.draw();
        });
        t_master.start_turn_chain.append(async () => {
            if(t_master.cur_phase == GamePhase.InAction) {
                // 將所有場所中的角色從疲勞中恢復
                let ch_in_arena = this.getAll(TG.isCharacter, c => {
                    return c.card_status == CardStat.Onboard && c.char_status == CharStat.InArena;
                });
                for(let ch of ch_in_arena) {
                    await this.changeCharTired(ch, false);
                }
            }
        });
        this.card_play_chain.append(card => {
            if(TG.isCharacter(card)) {
                this._char_quota--;
            }
        });
        this.incited_chain.appendCheck(() => {
            if(this.emo < C.INCITE_EMO) {
                return { var_arg: "情緒還不夠就想煽動我？" };
            } else if(this.t_master.cur_phase != GamePhase.InAction) {
                return { var_arg: "只能在主階段行動中執行煽動" };
            }
        });
        this.release_chain.appendCheck(() => {
            if(this.t_master.cur_phase != GamePhase.InAction) {
                return { var_arg: "只能在主階段行動中執行釋放" };
            }

        });
        this.release_chain.append(() => {
            return {
                after_effect: async () => {
                    this.addEmo(-1);
                }
            };
        }, undefined, RuleEnums.RecoverEmoAfterRelease);
    }
    
    /** 
     * 做打卡前的判斷，主要用來檢查前端界面
     * 舉例而言，有張角色的功能是施放咒語可降費
     * 那麼她應該修改全域的的 check_before_play_chain 使這些咒語不會被介面擋下來，可以進入到選擇施放者的步驟。
     * （然而如果最終不是由該角色施放，還是會被 card_play_chain 擋下來）
     */
    public check_before_play_chain = new GetterChain<boolean, IKnownCard>();
    /**
     * 雖然是一條行動鏈，但它的目地是用來設置等會行動要用到的參數（如價錢）
     * 千萬！千萬！不要在裡面引發會影響遊戲的副作用！！
     */
    public setup_before_action_chain = this.acf.new<{
        args: (IKnownCard | Player | null)[],
        action: ActionEnums
    }>();

    public change_char_tired_chain = this.acf.new<{ is_tired: boolean, char: ICharacter }>();

    public card_play_chain = this.acf.new<IKnownCard>();
    public card_retire_chain = this.acf.new<IKnownCard>();

    public set_mana_chain = this.acf.new<{ mana: number, caller: IKnownCard[] }>();
    public set_emo_chain = this.acf.new<{ emo: number, caller: IKnownCard[] }>();

    public ability_chain = this.acf.new<{ card: IKnownCard, ability: Ability }>();

    public fail_chain = this.acf.new<IEvent>();
    public get_push_cost_chain = new GetterChain<number, { char: ICharacter|null, event: IEvent }>();
    public add_progress_chain
        = this.acf.new<{ char: ICharacter|null, event: IEvent, n: number, is_push: boolean }>();
    readonly add_countdown_chain
        = this.acf.new<{ event: IEvent, n: number, is_natural: boolean}>();
    public finish_chain = this.acf.new<{ char: ICharacter|null, event: IEvent }>();

    public get_strength_chain
        = new GetterChain<number, { card: ICharacter|IUpgrade, enemy?: ICharacter }>();
    public get_inconflict_strength_chain
        = new GetterChain<number, { me: ICharacter, enemy: ICharacter }>();
    public get_mana_cost_chain
        = new GetterChain<number, IKnownCard>();
    public get_battle_role_chain
        = new GetterChain<BattleRole, ICharacter>();

    public add_card_to_hand_chain = this.acf.new<ICard>();
    public draw_card_chain = this.acf.new<ICard>();

    async addCard(card: ICard) {
        if(card.seq in this.card_table) {
            throw new BadOperationError("嘗試將已經有的卡牌塞給使用者");
        } else {
            if(card.card_status == CardStat.Hand) {
                await this.add_card_to_hand_chain.trigger(card, this.t_master.nonce);
            }
            this.card_table[card.seq] = card;
        }
    }

    async draw(seq?: number) {
        let card: ICard|null = null;
        if(seq) {
            card = this.card_table[seq];
            if(!card || card.card_status != CardStat.Deck) {
                throw new BadOperationError("欲檢索的卡牌不在牌庫中！");
            }
        } else {
            let deck = this.deck;
            let n = Math.floor(deck.length * Math.random());
            card = deck[n];
        }
        if(card) {
            let _card = card;
            await this.draw_card_chain.trigger(_card, this.t_master.nonce, async () => {
                await this.add_card_to_hand_chain.trigger(_card, this.t_master.nonce);
                _card.card_status = CardStat.Hand;
            });
        }
        return card;
    }

    async addEmo(n: number, caller: IKnownCard[] = []) {
        let new_emo = Math.max(0, this.emo + n);
        if(new_emo != this.emo) {
            await this.set_emo_chain
            .trigger({ emo: new_emo, caller }, this.t_master.nonce, () => {
                this._emo = new_emo;
            });
        }
    }

    getManaCost(card: IKnownCard, nonce=this.t_master.nonce) {
        return this.get_mana_cost_chain.chain(card.get_mana_cost_chain, null)
        .trigger(card.basic_mana_cost, card, nonce);
    }

    async addMana(n: number, caller: IKnownCard[] = []) {
        let new_mana = Math.max(0, this.mana + n);
        if(new_mana != this.mana) {
            await this.set_mana_chain
            .trigger({ mana: new_mana, caller }, this.t_master.nonce, () => {
                this._mana = new_mana;
            });
        }
    }
    /** 扣除魔力，不足者轉換為情緒 */
    async punish(n: number, caller: IKnownCard[] = []) {
        if(n <= 0) {
            throwDebugError("都要懲罰了數值卻小於0？");
        }
        let mana_cost = Math.min(this.mana, n);
        let emo_cost = n - mana_cost;
        await this.addMana(-mana_cost);
        await this.addEmo(emo_cost);
    }

    public get_score_chain = new GetterChain<number, null>();
    getScore() {
        let score = this.events_finished.reduce((sum, e) => sum + e.score, 0);
        return this.get_score_chain.trigger(score, null, this.t_master.nonce);
    }

    getStrength(card: ICharacter|IUpgrade, enemy?: ICharacter) {
        let strength = card.basic_strength;
        if(TG.isCharacter(card)) {
            for(let u of card.upgrade_list) {
                strength += this.getStrength(u);
            }
        }
        strength = this.get_strength_chain.chain(card.get_strength_chain, enemy)
        .trigger(strength, { enemy, card }, this.t_master.nonce);
        if(TG.isCharacter(card) && card.char_status == CharStat.InWar && card.is_tired) {
            return Math.min(0, strength);
        } else {
            return strength;
        }
    }

    getBattleRole(char: ICharacter) {
        return this.get_battle_role_chain.chain(char.get_battle_role_chain, null)
        .trigger(char.basic_battle_role, char, this.t_master.nonce);
    }
    /** 主要用於UI上的檢查 */
    checkBeforePlay(card: IKnownCard, nonce=this.t_master.nonce) {
        if(this.t_master.cur_player != this.player) {
            return false;
        }
        return this.check_before_play_chain.chain(card.check_before_play_chain, null)
        .trigger(true, card, nonce);
    }
    checkCanPlay(card: IKnownCard, nonce=this.t_master.nonce) {
        if(HR.checkPlay(this.player, card, this.mana, this.getManaCost(card, nonce))) {
            if(this.checkBeforePlay(card, nonce)) {
                return this.card_play_chain.chain(card.card_play_chain, null)
                .checkCanTrigger(card, nonce);
            }
        }
        return false;
    }
    async playCard(card: IKnownCard, by_keeper=false) {
        // 檢查
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合出牌？", card);
        } else if(!checkCardStat(card, CardStat.Hand)) {
            throw new BadOperationError("想打出手上沒有的牌？", card);
        }
        card.rememberDatas();
        let nonce = this.t_master.nonce;
        // TODO: before_action_chain
        if(!(await card.initialize()) || !this.checkCanPlay(card, nonce)) {
            card.recoverDatas();
            throwIfIsBackend("出牌過程取消");
            return false;
        }
        // 支付代價
        await this.addMana(-this.getManaCost(card, nonce));
        // 實際行動
        let res = await this.card_play_chain.chain(card.card_play_chain, null)
        .byKeeper(by_keeper)
        .trigger(card, nonce, async () => {
            await this.dangerouslySetToBoard(card);
            await Promise.resolve(card.onPlay());
        });
        if(!res) {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverDatas();
        }
        if(!card.instance) {
            await this.t_master.spendAction();
        }
        return true;
    }
    /** 會跳過大多數的檢查、設置、代價與行動鏈 */
    public readonly set_to_board_chain = this.acf.new<IKnownCard>();
    public async dangerouslySetToBoard(card: IKnownCard) {
        await this.set_to_board_chain.trigger(card, this.t_master.nonce, async () => {
            if(TG.isUpgrade(card)) {
                // 把這件升級加入角色的裝備欄
                if(card.data.character_equipped) {
                    card.data.character_equipped.setUpgrade(card);
                }
            } else if(TG.isArena(card)) {
                // 打出場所的規則（把之前的建築拆了）
                for(let a of this.arenas) {
                    if(!a.isEqual(card) && a.data.position == card.data.position) {
                        await this.retireCard(a);
                    }
                }
            }
            if(card.card_status != CardStat.Onboard) {
                card.card_status = CardStat.Onboard;
                card.setupAliveEffect();
            }
        });
    }

    async triggerAbility(card: IKnownCard, a_index: number, by_keeper=false): Promise<boolean> {
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合使用能力？");
        } else if(!checkCardStat(card)) {
            throw new BadOperationError("卡牌不在場上還想使用能力？");
            // TODO: 也許有些牌可以在歷史區施放能力？
        }
        let nonce = this.t_master.nonce;
        await this.setup_before_action_chain
        .trigger({args: [card], action: ActionEnums.Ability }, nonce);
        // TODO: before_action_chain
        let ability = card.abilities[a_index];
        if(ability && ability.canTrigger()
            && this.ability_chain.checkCanTrigger({ card, ability }, nonce)
        ) {
            let cost = ability.cost ? ability.cost : 0;
            if(this.mana >= cost) {
                await this.ability_chain.byKeeper(by_keeper)
                .trigger({ card, ability }, nonce, async () => {
                    await Promise.resolve(ability.func());
                });
                if(!ability.instance) {
                    this.t_master.spendAction();
                }
                return true;
            }
        }
        return false;
    }

    async changeCharTired(char: ICharacter, is_tired: boolean) {
        await this.change_char_tired_chain.chain(char.change_char_tired_chain, is_tired)
        .trigger({ char, is_tired }, this.t_master.nonce, () => {
            char.is_tired = is_tired;
        });
    }

    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    public readonly card_leave_chain = this.acf.new<{ card: ICard, stat: CardStat }>();
    private async _leaveCard(card: IKnownCard, stat: CardStat) {
        if(TG.isCharacter(card)) {
            if(card.data.arena_entered) {
                await this.exitArena(card);
            }
            // 銷毀所有升級
            for(let u of card.upgrade_list) {
                await this.retireCard(u);
            }
        } else if(TG.isUpgrade(card)) {
            if(card.data.character_equipped) {
                // 升級卡離場時，通知角色修改裝備欄
                card.data.character_equipped.unsetUpgrade(card);
            }
        }
        await this.card_leave_chain.chain(card.card_leave_chain, stat)
        .trigger({ card, stat }, this.t_master.nonce);
    }
    async retireCard(card: IKnownCard) {
        if(card.card_status == CardStat.Onboard) {
            let nonce = this.t_master.nonce;
            let chain = this.card_retire_chain.chain(card.card_retire_chain, null);
            let can_die = chain.checkCanTrigger(card, nonce);
            if(can_die) {
                await chain.trigger(card, nonce, async () => {
                    card.card_status = CardStat.Retired;
                    await this._leaveCard(card, CardStat.Retired);
                });
            }
        } else {
            throwDebugError("欲銷毀的卡牌不在場上", card);
        }
    }
    async exileCard(card: IKnownCard, stat = CardStat.Exile) {
        card.card_status = CardStat.Exile;
        await this._leaveCard(card, stat);
    }

    async addEventCountdown(event: IEvent, _n?: number) {
        let n = -1;
        let is_natural = true;
        if(typeof _n == "number") {
            n = _n;
            is_natural = false;
        }
        await this.add_countdown_chain.chain(event.add_countdown_chain, { n, is_natural })
        .trigger({ event, n, is_natural }, this.t_master.nonce, async () => {
            event.setTimeCount(event.cur_time_count + n);
            if(event.cur_time_count == 0) {
                await this.failEvent(event);
            }
        });
    }
    async failEvent(event: IEvent) {
        await this.fail_chain.chain(event.fail_chain, null)
        .trigger(event, this.t_master.nonce, async () => {
            await Promise.resolve(event.onFail());
            await this.retireCard(event);
        });
    }

    async finishEvent(char: ICharacter | null, event: IEvent) {
        // 應該不太需要 checkCanTrigger 啦 @@
        let finish_chain = this.finish_chain.chain(event.finish_chain, char);
        if(char) {
            finish_chain = finish_chain.chain(char.finish_chain, event);
        }
        await finish_chain
        .trigger({ char, event }, this.t_master.nonce, async () => {
            event.is_finished = true;
            await Promise.resolve(event.onFinish(char));
            await Promise.resolve(event.setupFinishEffect(char));
        });
    }
    getPushCost(char: ICharacter | null, event: IEvent, nonce: number) {
        let get_push_cost_chain = this.get_push_cost_chain.chain(event.get_push_cost_chain, char);
        if(char) {
            get_push_cost_chain = get_push_cost_chain.chain(char.get_push_cost_chain, event);
        }
        return get_push_cost_chain.trigger(event.push_cost, { char, event }, nonce);
    }
    async addEvenProgress(event: IEvent, char: ICharacter | null, _n: number): Promise<boolean>;
    async addEvenProgress(event: IEvent, char: ICharacter | null, by_keeper?: boolean): Promise<boolean>;
    async addEvenProgress(event: IEvent, char: ICharacter | null, arg?: boolean | number) {
        let nonce = this.t_master.nonce;
        // TODO: before_action_chain
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合推進事件？");
        } else if(event.owner != this.player || (char && char.owner != this.player)) {
            throw new BadOperationError("角色或事件不屬於你");
        } else if(!checkCardStat([event, char])) {
            throw new BadOperationError("事件或角色不在場上", [event, char]);
        }
        let is_push = true;
        let n = 1;
        let by_keeper: boolean | undefined;
        if(typeof arg == "number") {
            n = arg;
            is_push = false;
            by_keeper = false;
        } else {
            by_keeper = arg;
        }

        let cost = this.getPushCost(char, event, nonce);

        if(HR.checkPush(event, char, this.mana, cost)) {
            let push_chain = this.add_progress_chain.chain(event.add_progress_chain, { char, n, is_push });
            if(TG.isCard(char)) {
                push_chain = push_chain.chain(char.push_chain, event);
            }
            if(push_chain.checkCanTrigger({ event, char, n, is_push }, nonce)) {
                await this.addMana(-cost);
                if(char) {
                    await this.changeCharTired(char, true);
                }

                await push_chain.byKeeper(by_keeper)
                .trigger({ event, char, n, is_push }, nonce, async () => {
                    await Promise.resolve(event.onPush(char, nonce));
                    event.setProgrss(event.cur_progress_count + n);
                    if(event.cur_progress_count == event.goal_progress_count) {
                        // 事件已完成
                        await this.finishEvent(char, event);
                    }
                });
                await this.t_master.spendAction();
                return true;
            } else {
                throwIfIsBackend(push_chain.err_msg);
                return false;
            }
        }
        throwIfIsBackend("取消推進事件");
        return false;
    }

    // 底下所有函式都是「我的角色」與「任何人的場所」
    getEnterCost(char: ICharacter, arena: IArena, nonce: number): number {
        // NOTE: 觸發順序：場所 -> 角色 -> 世界
        return this.get_enter_cost_chain.chain(arena.get_enter_cost_chain, char)
        .chain(char.get_enter_cost_chain, arena)
        .trigger(0, { char, arena }, nonce);
    }
    async enterArena(arena: IArena, char: ICharacter, by_keeper=false) {
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合進入場所？");
        } else if(this.player != char.owner) {
            throw new BadOperationError("想移動別人的角色？");
        } else if(!checkCardStat([arena, char])) {
            throw new BadOperationError("角色或場所不在場上");
        }
        let nonce = this.t_master.nonce;
        // NOTE: before_action_chain

        let cost = this.getEnterCost(char, arena, nonce);
        if(HR.checkEnter(char, arena, this.mana, cost)) {
            let enter_chain = this.enter_chain.chain(arena.enter_chain, char)
            .chain(char.enter_chain, arena);
            if(enter_chain.checkCanTrigger({ arena, char }, nonce)) {
                await this.addMana(-cost);
                if(!char.assault) {
                    await this.changeCharTired(char, true);
                }
                
                await enter_chain.byKeeper(by_keeper)
                .trigger({ char, arena }, nonce, () => {
                    HR.onEnter(char, arena);
                });
                await this.t_master.spendAction();
                return true;
            }
        }
        throwIfIsBackend("進入程序取消");
        return false;
    }
    getExploitCost(arena: IArena, char: ICharacter | Player, nonce: number) {
        let get_cost_chain = this.get_exploit_cost_chain
        .chain(arena.get_exploit_cost_chain, char);
        if(TG.isCard(char)) {
            get_cost_chain.chain(char.get_exploit_cost_chain, arena);
        }
        return get_cost_chain.trigger(arena.basic_exploit_cost, { char, arena }, nonce);
    }
    async exploit(arena: IArena, char: ICharacter | Player, by_keeper=false) {
        let p = (() => {
            if(TG.isCard(char)) {
                return char.owner;
            } else {
                return char;
            }
        })();
        if(p != this.t_master.cur_player) {
            throw new BadOperationError("想在別人的回合使用場所？");
        } else if(p != this.player) {
            throw new BadOperationError("想幫別人使用場所？");
        } else if(!checkCardStat([arena, char])) {
            throw new BadOperationError("場所或角色不在場上");
        }
        let nonce = this.t_master.nonce;
        let setup_res = await this.setup_before_action_chain
        .trigger({ args: [arena, char], action: ActionEnums.Exploit }, nonce);

        let cost = this.getExploitCost(arena, char, nonce);
        if(setup_res && HR.checkExploit(arena, char, this.mana, cost)) {
            let exploit_chain = this.exploit_chain.chain(arena.exploit_chain, char);
            if(TG.isCard(char)) {
                exploit_chain = exploit_chain.chain(char.exploit_chain, arena);
            }
            if(exploit_chain.checkCanTrigger({ char, arena }, nonce)) {
                await this.addMana(-cost);
                await exploit_chain.byKeeper(by_keeper)
                .trigger({ char, arena }, nonce, async () => {
                    let caller = [];
                    if(TG.isCard(char)) {
                        caller.push(char);
                    }
                    let income = await Promise.resolve(arena.onExploit(char, nonce));
                    if(income) {
                        await this.addMana(income, caller);
                    }
                });
                return true;
            }
        }
        return false;
    }

    async exitArena(char: ICharacter) {
        let _arena = char.data.arena_entered;
        if(_arena) {
            let arena = _arena;
            await this.exit_chain.trigger({ char, arena }, this.t_master.nonce, async () => {
                char.char_status = CharStat.StandBy;
                char.data.arena_entered = null;
                arena.exit(char);
                await this.changeCharTired(char, true);
            });
        } else {
            throwDebugError("不在場所的角色還想離開？");
        }
    }

    public readonly get_enter_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter }>();
    public readonly enter_chain = this.acf.new<{ arena: IArena, char: ICharacter }>();
    public readonly exit_chain = this.acf.new<{ arena: IArena, char: ICharacter }>();
    public readonly get_exploit_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter | Player }>();
    public readonly exploit_chain = this.acf.new<{ arena: IArena, char: ICharacter | Player }>();

    public readonly incited_chain = this.acf.new<ICharacter>();
    public readonly release_chain = this.acf.new<ICharacter>();
    /** 由玩家 player 煽動我方的角色 char */
    incite(char: ICharacter, player: Player, by_keeper=false) {
        if(this.t_master.cur_player != player) {
            throw new BadOperationError("想在別人的回合執行煽動？");
        } else if(char.owner != this.player) {
            throw new BadOperationError("要煽動角色，請找她的主人");
        } else if(!checkCardStat(char)) {
            throw new BadOperationError("角色不在場上");
        }
        let nonce = this.t_master.nonce;
        // TODO: before_action_chain ?
        let incited_chain = this.incited_chain.chain(char.incited_chain, null);
        let enemy_master = this.getMaster(player);
        if(enemy_master.mana > C.INCITE_COST
            && incited_chain.checkCanTrigger(char, nonce)
        ) {
            enemy_master.addMana(-C.INCITE_COST);
            incited_chain.byKeeper(by_keeper).trigger(char, nonce, () => {
                this.retireCard(char);
            });
            this.t_master.spendAction();
        }
    }
    async release(char: ICharacter, by_keeper=false) {
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合執行釋放？");
        } else if(char.owner != this.player) {
            throw new BadOperationError("要釋約放角色，請找她的主人");
        } else if(!checkCardStat(char)) {
            throw new BadOperationError("角色不在場上");
        }
        let nonce = this.t_master.nonce;
        // TODO: before_action_chain ?
        let release_chain = this.release_chain.chain(char.release_chain, null);
        if(release_chain.checkCanTrigger(char, nonce)) {
            await this.retireCard(char);
            await release_chain.byKeeper(by_keeper).trigger(char, nonce);
            await this.t_master.spendAction();
        }
    }
}