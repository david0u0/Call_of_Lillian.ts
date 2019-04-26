// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat, GamePhase, RuleEnums } from "../enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG, Ability, IUpgrade } from "../interface";
import { GetterChain } from "../hook";
import { throwIfIsBackend, BadOperationError, throwDevError } from "../errors";
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
        return this.getAll(TG.isEvent, c => c.card_status == CardStat.Onboard);
    }
    public get events_finished() {
        return this.getAll(TG.isEvent, c => c.card_status == CardStat.Onboard && c.is_finished);
    }

    // TODO: 應該要有一個參數 getCurPhase，用來得知現在是哪個遊戲階段
    constructor(private acf: ActionChainFactory, public readonly player: Player,
        private t_master: TimeMaster,
        private getMaster: (card: ICard | Player) => PlayerMaster,
    ) {
        let soft_rules = new SR(() => t_master.cur_phase);
        soft_rules.checkPlay(this.card_play_chain, () => this.char_quota);
        soft_rules.onGetBattleRole(this.get_battle_role_chain, this.getStrength.bind(this));
        soft_rules.checkPush(this.push_chain);
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
            if(card.can_play_phase.indexOf(this.t_master.cur_phase) == -1) {
                // 如果現在不是能打該牌的階段，就不讓他打
                return { var_arg: false };
            }
        });
        this.ability_chain.appendCheck((b, { ability }) => {
            if(ability.can_play_phase.indexOf(this.t_master.cur_phase) == -1) {
                // 如果現在不是能打該牌的階段，就不讓他打
                return { var_arg: false };
            }
        });
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
                await this.countdownEvent(event);
            }
            // 打角色的額度恢復
            this._char_quota = 1;
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
                throwIfIsBackend("情緒還不夠就想煽動我？");
                return { var_arg: false };
            } else if(this.t_master.cur_phase != GamePhase.InAction) {
                throwIfIsBackend("只能在主階段行動中執行煽動");
                return { var_arg: false };
            }
        });
        this.release_chain.appendCheck(() => {
            if(this.t_master.cur_phase != GamePhase.InAction) {
                throwIfIsBackend("只能在主階段行動中執行釋放");
                return { var_arg: false };
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

    public change_char_tired_chain = this.acf.new<{is_tired: boolean, char: ICharacter}>();

    public card_play_chain = this.acf.new<IKnownCard>();
    public card_retire_chain = this.acf.new<IKnownCard>();

    public set_mana_chain = this.acf.new<{ mana: number, caller: IKnownCard[] }>();
    public set_emo_chain = this.acf.new<{ emo: number, caller: IKnownCard[] }>();

    public ability_chain = this.acf.new<{ card: IKnownCard, ability: Ability }>();

    public fail_chain = this.acf.new<IEvent>();
    public get_push_cost_chain = new GetterChain<number, { char: ICharacter|null, event: IEvent }>();
    public push_chain = this.acf.new<{ char: ICharacter|null, event: IEvent }>();
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
        // TODO: 加上事件鏈?
        if(card.seq in this.card_table) {
            throw new BadOperationError("嘗試將已經有的卡牌塞給使用者");
        } else {
            if(card.card_status == CardStat.Hand) {
                await this.add_card_to_hand_chain.trigger(card);
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
            await this.draw_card_chain.trigger(_card, async () => {
                await this.add_card_to_hand_chain.trigger(_card);
                _card.card_status = CardStat.Hand;
            });
        }
        return card;
    }

    async addEmo(n: number, caller: IKnownCard[] = []) {
        let new_emo = Math.max(0, this.emo + n);
        await this.set_emo_chain.trigger({ emo: new_emo, caller }, () => {
            this._emo = new_emo;
        });
    }

    getManaCost(card: IKnownCard) {
        return card.get_mana_cost_chain.chain(this.get_mana_cost_chain, card)
        .trigger(card.basic_mana_cost, null);
    }

    async addMana(n: number, caller: IKnownCard[] = []) {
        let new_mana = Math.max(0, this.mana + n);
        await this.set_mana_chain.trigger({ mana: new_mana, caller }, () => {
            this._mana = new_mana;
        });
    }

    public get_score_chain = new GetterChain<number, null>();
    getScore() {
        let score = this.events_finished.reduce((sum, e) => sum + e.score, 0);
        return this.get_score_chain.trigger(score, null);
    }

    getStrength(card: ICharacter|IUpgrade, enemy?: ICharacter) {
        let strength = card.basic_strength;
        if(TG.isCharacter(card)) {
            for(let u of card.upgrade_list) {
                strength += this.getStrength(u);
            }
        }
        strength = card.get_strength_chain.chain(this.get_strength_chain, { card, enemy })
        .trigger(strength, enemy);
        if(TG.isCharacter(card) && card.char_status == CharStat.InWar && card.is_tired) {
            return Math.min(0, strength);
        } else {
            return strength;
        }
    }

    getBattleRole(char: ICharacter) {
        return char.get_battle_role_chain.chain(this.get_battle_role_chain, char)
        .trigger(char.basic_battle_role, null);
    }
    /** 主要用於UI上的檢查 */
    checkBeforePlay(card: IKnownCard) {
        if(this.t_master.cur_player != this.player) {
            return false;
        }
        let can_play = this.mana > this.getManaCost(card);
        return card.check_before_play_chain.chain(this.check_before_play_chain, card)
        .trigger(can_play, null);
    }
    checkCanPlay(card: IKnownCard) {
        if(HR.checkPlay(this.player, card, this.mana, this.getManaCost(card))) {
            if(this.checkBeforePlay(card)) {
                return card.card_play_chain.chain(this.card_play_chain, card)
                .checkCanTrigger(null);
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
        if(!(await card.initialize()) || !this.checkCanPlay(card)) {
            card.recoverDatas();
            return false;
        }
        // 支付代價
        await this.addMana(-this.getManaCost(card));
        // 實際行動
        await card.card_play_chain.chain(this.card_play_chain, card).byKeeper(by_keeper)
        .trigger(null, async () => {
            await this.dangerouslySetToBoard(card);
            await Promise.resolve(card.onPlay());
        }, () => {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverDatas();
        });
        if(!card.instance) {
            await this.t_master.spendAction();
        }
    }
    /** 會跳過大多數的檢查、設置、代價與行動鏈 */
    public readonly add_card_chain = this.acf.new<IKnownCard>();
    public async dangerouslySetToBoard(card: IKnownCard) {
        await this.add_card_chain.trigger(card, async () => {
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

    async triggerAbility(card: IKnownCard, a_index: number, by_keeper=false) {
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合使用能力？");
        } else if(!checkCardStat(card)) {
            throw new BadOperationError("卡牌不在場上還想使用能力？");
            // TODO: 也許有些牌可以在歷史區施放能力？
        }
        let ability = card.abilities[a_index];
        if(ability && ability.canTrigger() && this.ability_chain.checkCanTrigger({ card, ability })) {
            let cost = ability.cost ? ability.cost : 0;
            if(this.mana >= cost) {
                await this.ability_chain.byKeeper(by_keeper)
                .trigger({ card, ability }, async () => {
                    await Promise.resolve(ability.func());
                });
                if(!ability.instance) {
                    this.t_master.spendAction();
                }
                return true;
            } else {
                return false;
            }
        }
    }

    async changeCharTired(char: ICharacter, is_tired: boolean) {
        await char.change_char_tired_chain.chain(this.change_char_tired_chain, { is_tired, char })
        .trigger(is_tired, () => {
            char.is_tired = is_tired;
        });
    }

    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    private async _leaveCard(card: IKnownCard) {
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
        await card.card_leave_chain.trigger(null);
    }
    async retireCard(card: IKnownCard) {
        if(card.card_status == CardStat.Onboard) {
            let chain = card.card_retire_chain.chain(this.card_retire_chain, card);
            let can_die = chain.checkCanTrigger(null);
            if(can_die) {
                await chain.trigger(null, async () => {
                    card.card_status = CardStat.Retired;
                    await this._leaveCard(card);
                });
            }
        } else {
            throwDevError("欲銷毀的卡牌不在場上", card);
        }
    }
    async exileCard(card: IKnownCard) {
        card.card_status = CardStat.Exile;
        await this._leaveCard(card);
    }

    // 底下這些處理事件卡的函式先不考慮「推進別人的事件」這種狀況
    async countdownEvent(event: IEvent) {
        event.countDown();
        if(event.cur_time_count == 0) {
            this.failEvent(event);
        }
    }
    async failEvent(event: IEvent) {
        await event.fail_chain.chain(this.fail_chain, event)
        .trigger(null, async () => {
            await Promise.resolve(event.onFail());
            await this.retireCard(event);
        });
    }

    async finishEvent(char: ICharacter | null, event: IEvent) {
        // 應該不太需要 checkCanTrigger 啦 @@
        await event.finish_chain.chain(this.finish_chain, { event, char })
        .trigger(char, async () => {
            event.is_finished = true;
            await Promise.resolve(event.onFinish(char));
            await Promise.resolve(event.setupFinishEffect(char));
        });
    }
    getPushCost(char: ICharacter | null, event: IEvent) {
        let cost_chain = event.get_push_cost_chain
        .chain(this.get_push_cost_chain, { event, char });
        if(TG.isCard(char)) {
            cost_chain.chain(char.get_push_cost_chain, event);
        }
        return cost_chain.trigger(event.push_cost, char);
    }
    async pushEvent(event: IEvent, char: ICharacter | null, by_keeper=false) {
        // TODO: 這裡應該要有一條 pre-push 動作鏈
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合推進事件？");
        } else if(event.owner != this.player || (char && char.owner != this.player)) {
            throw new BadOperationError("角色或事件不屬於你");
        } else if(!checkCardStat([event, char])) {
            throw new BadOperationError("事件或角色不在場上", [event, char]);
        }

        let cost = this.getPushCost(char, event);

        if(HR.checkPush(event, char, this.mana, cost)) {
            let push_chain = event.push_chain;
            if(TG.isCard(char)) {
                push_chain = push_chain.chain(char.push_chain, event);
            }
            push_chain = push_chain.chain(this.push_chain, { event, char });
            if(push_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                if(char) {
                    await this.changeCharTired(char, true);
                }

                await push_chain.byKeeper(by_keeper).trigger(char, async () => {
                    HR.onPushEvent(event);
                    await Promise.resolve(event.onPush(char));
                    if(event.cur_progress_count == event.goal_progress_count) {
                        // 事件已完成
                        await this.finishEvent(char, event);
                    }
                });
                await this.t_master.spendAction();
                return true;
            }
        }
        throwIfIsBackend("取消推進事件");
        return false;
    }

    // 底下所有函式都是「我的角色」與「任何人的場所」
    getEnterCost(char: ICharacter, arena: IArena): number {
        // NOTE: 觸發順序：場所 -> 角色 -> 世界
        return arena.get_enter_cost_chain.chain(char.get_enter_cost_chain, arena)
        .chain(this.get_enter_cost_chain, { char, arena })
        .trigger(0, char);
    }
    async enterArena(arena: IArena, char: ICharacter, by_keeper=false) {
        // TODO: 這裡應該要有一條 pre-enter 動作鏈
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合進入場所？");
        } else if(this.player != char.owner) {
            throw new BadOperationError("想移動別人的角色？");
        } else if(!checkCardStat([arena, char])) {
            throw new BadOperationError("角色或場所不在場上");
        }

        let cost = this.getEnterCost(char, arena);
        if(HR.checkEnter(char, arena, this.mana, cost)) {
            let enter_chain = arena.enter_chain.chain(char.enter_arena_chain, arena)
            .chain(this.enter_chain, { char, arena });
            if(enter_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                if(!char.assault) {
                    await this.changeCharTired(char, true);
                }
                
                await enter_chain.byKeeper(by_keeper).trigger(char, () => {
                    HR.onEnter(char, arena);
                });
                await this.t_master.spendAction();
                return true;
            }
        }
        throwIfIsBackend("進入程序取消");
        return false;
    }
    getExploitCost(arena: IArena, char: ICharacter | Player) {
        let get_cost_chain = arena.get_exploit_cost_chain
        .chain(this.get_exploit_cost_chain, { arena, char });
        if(TG.isCard(char)) {
            get_cost_chain.chain(char.get_exploit_cost_chain, arena);
        }
        return get_cost_chain.trigger(arena.basic_exploit_cost, char);
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
        // TODO: 這裡應該要有一條 pre-exploit 動作鏈
        let cost = this.getExploitCost(arena, char);
        if(HR.checkExploit(arena, char, this.mana, cost)) {
            let exploit_chain = arena.exploit_chain;
            if(TG.isCard(char)) {
                exploit_chain = exploit_chain.chain(char.exploit_chain, arena);
            }
            exploit_chain = exploit_chain.chain(this.exploit_chain, { arena, char });
            if(exploit_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                await exploit_chain.byKeeper(by_keeper).trigger(char, async () => {
                    let caller = [];
                    if(TG.isCard(char)) {
                        caller.push(char);
                    }
                    let income = await Promise.resolve(arena.onExploit(char));
                    if(income) {
                        await this.addMana(income, caller);
                    }
                });
            }
        }
    }

    async exitArena(char: ICharacter) {
        let _arena = char.data.arena_entered;
        if(_arena) {
            let arena = _arena;
            await this.exit_chain.trigger({ char, arena }, async () => {
                char.char_status = CharStat.StandBy;
                char.data.arena_entered = null;
                arena.exit(char);
                await this.changeCharTired(char, true);
            });
        } else {
            throw new BadOperationError("不在場所的角色還想離開？");
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
        let incited_chain = char.incited_chain.chain(this.incited_chain, char);
        let enemy_master = this.getMaster(player);
        if(enemy_master.mana > C.INCITE_COST
            && incited_chain.checkCanTrigger(null)
        ) {
            enemy_master.addMana(-C.INCITE_COST);
            incited_chain.byKeeper(by_keeper).trigger(null, () => {
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
        let release_chain = char.release_chain.chain(this.release_chain, char);
        if(release_chain.checkCanTrigger(null)) {
            await this.retireCard(char);
            await release_chain.byKeeper(by_keeper).trigger(null);
            await this.t_master.spendAction();
        }
    }
}