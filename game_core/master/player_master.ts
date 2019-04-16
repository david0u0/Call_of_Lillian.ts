// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat, GamePhase } from "../enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG } from "../interface";
import { ActionChain, GetterChain } from "../hook";
import { throwIfIsBackend, BadOperationError } from "../errors";
import { SoftRule as SR, HardRule as HR, Constant as C } from "../general_rules";
import { TimeMaster } from "./time_master";

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
        return this.getAll(TG.isEvent, c => c.card_status == CardStat.Finished);
    }

    // TODO: 應該要有一個參數 getCurPhase，用來得知現在是哪個遊戲階段
    constructor(public readonly player: Player, private t_master: TimeMaster,
        private getMaster: (card: ICard | Player)=> PlayerMaster
    ) {
        let soft_rules = new SR(() => t_master.cur_phase);
        soft_rules.checkPlay(this.card_play_chain, () => this.char_quota);
        soft_rules.onGetBattleRole(this.get_battle_role_chain, this.getStrength.bind(this));
        soft_rules.onFail(this.fail_chain, () => this.mana,
            this.addMana.bind(this), this.addEmo.bind(this));
        soft_rules.checkPush(this.push_chain);
        soft_rules.onFinish(this.finish_chain, this.retireCard.bind(this));
        soft_rules.onGetManaCost(this.get_mana_cost_chain, () => this.arenas);
        soft_rules.onGetEnterCost(this.get_enter_cost_chain);
        soft_rules.checkEnter(this.enter_chain);
        soft_rules.checkExploit(this.exploit_chain);
        soft_rules.onEnter(this.enter_chain, (p, mana) => {
            this.getMaster(p).addMana(mana);
        });
        t_master.start_building_chain.append(async () => {
            // 所有角色解除疲勞並離開場所
            for(let char of this.characters) {
                await this.changeCharTired(char, false);
                if(char.arena_entered) {
                    await this.exitArena(char);
                }
            }
            // 所有事件倒數減1
            for(let event of this.events_ongoing) {
                await this.countdownEvent(event);
            }
            // 打角色的額度恢復
            this._char_quota = 1;
            // 抽牌
            this.draw();
            // TODO: 換牌
        });
        this.card_play_chain.append(card => {
            if(TG.isCharacter(card)) {
                this._char_quota--;
            }
        });
        this.incited_chain.appendCheck(() => {
            if(this.emo <= C.INCITE_EMO) {
                throwIfIsBackend("情緒還不夠就想煽動我？");
                return { var_arg: false };
            } else if(this.t_master.cur_phase != GamePhase.InAction) {
                throwIfIsBackend("只能在主階段行動中執行煽動");
                return { var_arg: false };
            }
        });
    }
    
    /** 
     * 做打卡前的判斷，主要用來檢查前端界面
     * 舉例而言，有張角色的功能是施放咒語可降費
     * 那麼她應該修改全域的的 check_before_play_chain 使這些咒語不會被介面擋下來，可以進入到選擇施放者的步驟。
     * （然而如果最終不是由該角色施放，還是會被 card_play_chain 擋下來）
     */
    public check_before_play_chain = new GetterChain<boolean, IKnownCard>();

    public change_char_tired_chain = new ActionChain<{is_tired: boolean, char: ICharacter}>();

    public card_play_chain = new ActionChain<IKnownCard>();
    public card_retire_chain = new ActionChain<IKnownCard>();

    public set_mana_chain = new ActionChain<{ mana: number, caller: IKnownCard[] }>();
    public set_emo_chain = new ActionChain<{ emo: number, caller: IKnownCard[] }>();

    public ability_chain = new ActionChain<{ card: IKnownCard, a_index: number }>();

    public fail_chain = new ActionChain<IEvent>();
    public get_push_cost_chain = new GetterChain<number, { char: ICharacter|null, event: IEvent }>();
    public push_chain = new ActionChain<{ char: ICharacter|null, event: IEvent }>();
    public finish_chain = new ActionChain<{ char: ICharacter|null, event: IEvent }>();

    public get_strength_chain
        = new GetterChain<number, { char: ICharacter, enemy?: ICharacter }>();
    public get_inconflict_strength_chain
        = new GetterChain<number, { me: ICharacter, enemy: ICharacter }>();
    public get_mana_cost_chain
        = new GetterChain<number, IKnownCard>();
    public get_battle_role_chain
        = new GetterChain<BattleRole, ICharacter>();

    public draw_card_chain = new ActionChain<ICard>();

    addCard(card: ICard) {
        // TODO: 加上事件鏈?
        if(card.seq in this.card_table) {
            throw new BadOperationError("嘗試將已經有的卡牌塞給使用者");
        } else {
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
            await this.draw_card_chain.trigger(card, () => {
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

    getScore() {
        return this.events_finished.reduce((sum, e) => sum + e.score, 0);
    }

    getStrength(char: ICharacter, enemy?: ICharacter) {
        let strength = char.basic_strength;
        for(let u of char.upgrade_list) {
            strength += u.basic_strength;
        }
        return char.get_strength_chain.chain(this.get_strength_chain, { char, enemy })
        .trigger(strength, enemy);
    }

    getBattleRole(char: ICharacter) {
        return char.get_battle_role_chain.chain(this.get_battle_role_chain, char)
        .trigger(char.basic_battle_role, null);
    }
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
            return card.card_play_chain.chain(this.card_play_chain, card)
            .checkCanTrigger(null);
        } else {
            return false;
        }
    }
    async playCard(card: IKnownCard, by_keeper=false) {
        // 檢查
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合出牌？", card);
        }
        card.rememberFields();
        if(!(await card.initialize()) || !this.checkCanPlay(card)) {
            card.recoverFields();
            return false;
        }
        // 支付代價
        await this.addMana(-this.getManaCost(card));
        if(!card.instance) {
            if(this.t_master.cur_phase == GamePhase.InAction) {
                await this.t_master.addActionPoint(-1);
            }
        }
        // 實際行動
        return await card.card_play_chain.chain(this.card_play_chain, card)
        .triggerByKeeper(by_keeper, null, async () => {
            card.card_status = CardStat.Onboard;
            await Promise.resolve(card.onPlay());
            await this.dangerouslyGenToBoard(card);
        }, () => {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverFields();
        });
    }
    /** 會跳過大多數的檢查、代價與行動鏈 */
    public async dangerouslyGenToBoard(card: IKnownCard) {
        await Promise.resolve(card.setupAliveeEffect());
        if(TG.isUpgrade(card)) {
            // 把這件升級加入角色的裝備欄
            if(card.character_equipped) {
                card.character_equipped.addUpgrade(card);
            }
        } else if(TG.isCharacter(card)) {
            await this.addCharacter(card);
        } else if(TG.isArena(card)) {
            // 打出場所的規則（把之前的建築拆了）
            for(let a of this.arenas) {
                if(!a.isEqual(card) && a.position == card.position) {
                    await this.retireCard(a);
                }
            }
            await this.addArena(card, card.position);
        } else if(TG.isEvent(card)) {
            await this.addEvent(card);
        }
    }

    async triggerAbility(card: IKnownCard, a_index: number, by_keeper=false) {
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合使用能力？");
        }
        let ability = card.abilities[a_index];
        if(ability && ability.canTrigger() && this.ability_chain.checkCanTrigger({ card, a_index })) {
            let cost = ability.cost ? ability.cost : 0;
            if(this.mana >= cost) {
                await this.ability_chain
                .triggerByKeeper(by_keeper, { card, a_index }, () => {
                    this.t_master.addActionPoint(-1);
                    ability.func();
                });
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
        if(TG.isCharacter(card) && card.arena_entered) {
            await this.exitArena(card);
        }
        HR.onLeave(card, this.retireCard.bind(this));
        await card.card_leave_chain.trigger(null);
    }
    async retireCard(card: IKnownCard) {
        if(card.card_status == CardStat.Onboard) {
            let chain = card.card_retire_chain.chain(this.card_retire_chain, card);
            let can_die = chain.checkCanTrigger(null);
            if(can_die) {
                await chain.trigger(null, async () => {
                    await this._leaveCard(card);
                    card.card_status = CardStat.Retired;
                });
            }
        } else {
            throwIfIsBackend("重複銷毀一張卡片", card);
        }
    }
    async exileCard(card: IKnownCard) {
        await this._leaveCard(card);
        card.card_status = CardStat.Exile;
    }

    public readonly add_char_chain = new ActionChain<ICharacter>();
    private async addCharacter(char: ICharacter) {
        await this.add_char_chain.trigger(char);
    }
    public readonly add_event_chain = new ActionChain<IEvent>();
    private async addEvent(event: IEvent) {
        await this.add_event_chain.trigger(event);
    }
    public readonly add_arena_chain = new ActionChain<IArena>();
    private async addArena(card: IArena, position: number) {
        await this.add_arena_chain.trigger(card);
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
            this.retireCard(event);
        });
    }

    async finishEvent(char: ICharacter | null, event: IEvent) {
        // 應該不太需要 checkCanTrigger 啦 @@
        await event.finish_chain.chain(this.finish_chain, { event, char })
        .trigger(char, async () => {
            event.card_status = CardStat.Finished;
            this._leaveCard(event);
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
        }
        let push_chain = new ActionChain<ICharacter | null>();
        let cost = this.getPushCost(char, event);

        if(HR.checkPush(event, char, this.mana, cost)) {
            push_chain = event.push_chain.chain(this.push_chain, { event, char });
            if(TG.isCard(char)) {
                push_chain.chain(char.push_chain, event);
            }
            if(push_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                if(this.t_master.cur_phase == GamePhase.InAction) {
                    await this.t_master.addActionPoint(-1);
                }
                if(char) {
                    await this.changeCharTired(char, true);
                }

                return await push_chain.triggerByKeeper(by_keeper, char, async () => {
                    HR.onPushEvent(event);
                    await Promise.resolve(event.onPush(char));
                    if(event.cur_progress_count == event.goal_progress_count) {
                        // 事件已完成
                        await this.finishEvent(char, event);
                    }
                });
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
        }

        let cost = this.getEnterCost(char, arena);
        if(HR.checkEnter(char, arena, this.mana, cost)) {
            let enter_chain = arena.enter_chain.chain(char.enter_arena_chain, arena)
            .chain(this.enter_chain, { char, arena });
            if(enter_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                if(this.t_master.cur_phase == GamePhase.InAction) {
                    await this.t_master.addActionPoint(-1);
                }
                await this.changeCharTired(char, true);
                
                return await enter_chain.triggerByKeeper(by_keeper, char, () => {
                    HR.onEnter(char, arena);
                });
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
            throw new BadOperationError("想幫別人的角色使用場所？");
        }
        // TODO: 這裡應該要有一條 pre-exploit 動作鏈
        let cost = this.getExploitCost(arena, char);
        if(HR.checkExploit(arena, char, this.mana, cost)) {
            let exploit_chain = arena.exploit_chain
            .chain(this.exploit_chain, { arena, char });
            if(TG.isCard(char)) {
                exploit_chain.chain(char.exploit_chain, arena);
            }
            if(exploit_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                await exploit_chain.triggerByKeeper(by_keeper, char, async () => {
                    let caller = [];
                    if(TG.isCard(char)) {
                        caller.push(char);
                        this.exitArena(char);
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
        let _arena = char.arena_entered;
        if(_arena) {
            let arena = _arena;
            this.exit_chain.trigger({ char, arena }, async () => {
                char.char_status = CharStat.StandBy;
                char.arena_entered = null;
                arena.exit(char);
                await this.changeCharTired(char, true);
            });
        } else {
            throw new BadOperationError("不在場所的角色還想離開？");
        }
    }

    public readonly get_enter_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter }>();
    public readonly enter_chain = new ActionChain<{ arena: IArena, char: ICharacter }>();
    public readonly exit_chain = new ActionChain<{ arena: IArena, char: ICharacter }>();
    public readonly get_exploit_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter | Player }>();
    public readonly exploit_chain = new ActionChain<{ arena: IArena, char: ICharacter | Player }>();

    public readonly incited_chain = new ActionChain<ICharacter|null>();
    /** 由玩家 player 煽動我方的角色 char */
    incite(char: ICharacter, player: Player, by_keeper=false) {
        if(this.t_master.cur_player != player) {
            throw new BadOperationError("想在別人的回合執行煽動？");
        } else if(char.owner != this.player) {
            throw new BadOperationError("要煽動角色，請找她的主人");
        }
        let enemy_master = this.getMaster(player);
        if(enemy_master.mana > C.INCITE_COST
            && char.card_status == CardStat.Onboard
            && this.incited_chain.checkCanTrigger(char)
        ) {
            enemy_master.addMana(-C.INCITE_COST);
            this.t_master.addActionPoint(-1);
            this.incited_chain.triggerByKeeper(by_keeper, char, () => {
                this.retireCard(char);
            });
        }
    }

}