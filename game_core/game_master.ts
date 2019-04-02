// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat } from "./enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG, ISelecter } from "./interface";
import { ActionChain, GetterChain } from "./hook";
import { throwIfIsBackend, BadOperationError } from "./errors";
import { SoftRule as SR, HardRule as HR, Constant as C } from "./general_rules";

class PlayerMaster {
    private _mana = 0;
    private _emo = 0;
    private _deck = new Array<ICard>();
    private _hand = new Array<ICard>();
    // private _gravyard = new Array<IKnownCard>();
    private _characters = new Array<ICharacter>();
    private _arenas = new Array<IArena>(C.MAX_ARENA);
    private _events_ongoing = new Array<IEvent>();
    private _events_finished = new Array<IEvent>();
    public get mana() { return this._mana; };
    public get emo() { return this._emo; };
    public get deck() { return [...this._deck]; };
    public get hand() { return [...this._hand]; };
    public get characters() { return [...this._characters]; };
    public get arenas() { return [...this._arenas]; };
    public get events_ongoing() { return [...this._events_ongoing]; };
    public get events_finished() { return [...this._events_finished]; };

    constructor(public readonly player: Player, private readonly selecter: ISelecter) {
        SR.checkPlay(this.card_play_chain);
        SR.onGetBattleRole(this.get_battle_role_chain, this.getStrength.bind(this));
        SR.onFail(this.fail_chain, () => this.mana,
            this.addMana.bind(this), this.addEmo.bind(this));
        SR.checkPush(this.push_chain);
        SR.onFinish(this.finish_chain, this.retireCard.bind(this));
        SR.onGetManaCost(this.get_mana_cost_chain, this.arenas);
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

    public set_mana_chain = new ActionChain<number>();
    public set_emo_chain = new ActionChain<number>();

    public fail_chain = new ActionChain<IEvent>();
    public get_push_cost_chain = new GetterChain<number, { char: ICharacter|null, event: IEvent }>();
    public push_chain = new ActionChain<{ char: ICharacter|null, event: IEvent }>();
    public finish_chain = new ActionChain<{ char: ICharacter|null, event: IEvent }>();

    public get_strength_chain
        = new GetterChain<number, ICharacter>();
    public get_inconflict_strength_chain
        = new GetterChain<number, { me: ICharacter, enemy: ICharacter }>();
    public get_mana_cost_chain
        = new GetterChain<number, IKnownCard>();
    public get_battle_role_chain
        = new GetterChain<BattleRole, ICharacter>();

    addToDeck(card: IKnownCard) {
        // TODO: 加上事件鏈?
        this._deck.push(card);
    }
    addToHand(card: IKnownCard) {
        // TODO: 加上事件鏈?
        this._hand.push(card);
    }
    draw(seq?: number) {
        // TODO: 加上事件鏈?
        // TODO: 用 seq 實現檢索的可能
        let card = this._deck.pop();
        if(card) {
            card.card_status = CardStat.Hand;
        }
        return card;
    }

    async addEmo(n: number) {
        let new_emo = Math.max(0, this.emo + n);
        await this.set_emo_chain.trigger(new_emo, () => {
            this._emo = new_emo;
        });
    }

    getManaCost(card: IKnownCard) {
        return card.get_mana_cost_chain.chain(this.get_mana_cost_chain, card)
        .trigger(card.basic_mana_cost, null);
    }

    async addMana(n: number) {
        let new_mana = Math.max(0, this.mana + n);
        await this.set_mana_chain.trigger(new_mana, () => {
            this._mana = new_mana;
        });
    }

    getScore() {
        // TODO: 這邊是不是也該寫個鏈？
        return this.events_finished.reduce((sum, e) => sum + e.score, 0);
    }

    getStrength(char: ICharacter) {
        let strength = char.basic_strength;
        for(let u of char.upgrade_list) {
            strength += u.basic_strength;
        }
        return char.get_strength_chain.chain(this.get_strength_chain, char)
        .trigger(strength, null);
    }
    
    getBattleRole(char: ICharacter) {
        return char.get_battle_role_chain.chain(this.get_battle_role_chain, char)
        .trigger(char.basic_battle_role, null);
    }
    checkBeforePlay(card: IKnownCard) {
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
    async playCard(card: IKnownCard) {
        card.rememberFields();
        if(!(await card.initialize()) || !this.checkCanPlay(card)) {
            card.recoverFields();
            return false;
        }
        await this.addMana(-this.getManaCost(card));
        await card.card_play_chain.chain(this.card_play_chain, card).trigger(null, async () => {
            card.card_status = CardStat.Onboard;
            HR.onPlay(card, this.addCharacter.bind(this),
                this.addEvent.bind(this));
            await Promise.resolve(card.onPlay());
        }, () => {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverFields();
        });
        return true;
    }

    async changeCharTired(char: ICharacter, is_tired: boolean) {
        await char.change_char_tired_chain.chain(this.change_char_tired_chain, { is_tired, char })
        .trigger(is_tired, () => {
            char.is_tired = is_tired;
        });
    }

    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    private async _leaveCard(card: IKnownCard) {
        await card.card_leave_chain.trigger(null);
        HR.onLeave(card, this.retireCard.bind(this));
    }
    async retireCard(card: IKnownCard) {
        if(card.card_status == CardStat.Onboard) {
            let chain = card.card_retire_chain.chain(this.card_retire_chain, card);
            let can_die = chain.checkCanTrigger(null);
            if(can_die) {
                await this._leaveCard(card);
                await chain.trigger(null, () => {
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

    addCharacter(char: ICharacter) {
        this._characters.push(char);
    }
    addEvent(event: IEvent) {
        this._events_ongoing.push(event);
    }

    // 底下這些處理事件卡的函式先不考慮「推進別人的事件」這種狀況
    async failEvent(event: IEvent) {
        await this.fail_chain.trigger(event, async () => {
            await Promise.resolve(event.onFail());
            this.retireCard(event);
        });
    }

    async finishEvent(char: ICharacter|null, event: IEvent) {
        // 應該不太需要 checkCanTrigger 啦 @@
        await this.finish_chain.trigger({ char, event }, async () => {
            event.card_status = CardStat.Finished;
            this._events_finished.push(event);
            await Promise.resolve(event.onFinish(char));
        });
    }
    getPushCost(char: ICharacter|null, event: IEvent) {
        let cost_chain = event.get_push_cost_chain
        .chain(this.get_push_cost_chain, { event, char });
        if(TG.isCard(char)) {
            cost_chain.chain(char.get_push_cost_chain, event);
        }
        return cost_chain.trigger(event.push_cost, char);
    }
    async pushEvent(char: ICharacter|null) {
        let push_chain = new ActionChain<ICharacter|null>();
        let cost = 0;
        let _event = await this.selecter.selectSingleCard(TG.isEvent, event => {
            cost = this.getPushCost(char, event);
            if(HR.checkPush(event, char, this.mana, cost)) {
                push_chain = event.push_chain.chain(this.push_chain, { event, char });
                if(TG.isCard(char)) {
                    push_chain.chain(char.push_chain, event);
                }
                return push_chain.checkCanTrigger(char);
            } else {
                return false;
            }
        });

        if(_event) {
            let event = _event;
            this.addMana(-cost);
            if(char) {
                await this.changeCharTired(char, true);
            }
            await push_chain.trigger(char, async () => {
                HR.onPushEvent(event);
                await Promise.resolve(event.onPush(char));
                if(event.cur_progress_count == event.goal_progress_count) {
                    // 事件已完成
                    await this.finishEvent(char, event);
                }
            });
        }
    }
}

class GameMaster {
    private _cur_seq = 1;
    public readonly card_table: { [index: number]: IKnownCard } = {};
    getSeqNumber(): number {
        return this._cur_seq++;
    }
    private genCard(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => IKnownCard
    ): IKnownCard {
        let c = card_constructor(this.getSeqNumber(), owner, this);
        this.card_table[c.seq] = c;
        return c;
    }
    genCardToDeck(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => IKnownCard
    ): IKnownCard {
        let c = this.genCard(owner, card_constructor);
        this.getMyMaster(owner).addToDeck(c);
        return c;
    }
    genCardToHand(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => IKnownCard
    ): IKnownCard {
        let c = this.genCard(owner, card_constructor);
        c.card_status = CardStat.Hand;
        this.getMyMaster(owner).addToHand(c);
        return c;
    }
    // 應該就一開始會用到而已 吧？
    genArenaToBoard(owner: Player, pos: number,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => IArena
    ): IArena {
        let arena = this.genCard(owner, card_constructor) as IArena;
        arena.card_status = CardStat.Onboard;
        this.getMyMaster(owner).arenas[pos] = arena;
        arena.position = pos;
        return arena;
    }

    private p_master1: PlayerMaster = new PlayerMaster(Player.Player1, this.selecter);
    private p_master2: PlayerMaster = new PlayerMaster(Player.Player2, this.selecter);
    getMyMaster(arg: Player|IKnownCard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getMyMaster(arg.owner);
        } else if(arg == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(arg: Player|IKnownCard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getEnemyMaster(arg.owner);
        } else if(arg == Player.Player2) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }

    constructor(public readonly selecter: ISelecter) {
        SR.onGetEnterCost(this.get_enter_cost_chain);
        SR.checkEnter(this.enter_chain);
        SR.onEnter(this.enter_chain, (p, mana) => {
            this.getMyMaster(p).addMana(mana);
        });
        SR.checkExploit(this.exploit_chain);
        selecter.setCardTable(this.card_table);
    }

    getEnterCost(char: ICharacter, arena: IArena): number {
        // NOTE: 觸發順序：場所 -> 角色 -> 世界
        return arena.get_enter_cost_chain.chain(char.get_enter_cost_chain, arena)
        .chain(this.get_enter_cost_chain, { char, arena })
        .trigger(0, char);
    }
    async enterArena(char: ICharacter) {
        let p_master = this.getMyMaster(char);
        let _arena = await this.selecter.selectSingleCard(TG.isArena, arena => {
            if(HR.checkEnter(char, arena, p_master.mana, this.getEnterCost(char, arena))) {
                return arena.enter_chain.chain(char.enter_arena_chain, arena)
                .chain(this.enter_chain, { char, arena }).checkCanTrigger(char);
            } else {
                return false;
            }
        });
        if(_arena) {
            let arena = _arena;
            let enter_chain = arena.enter_chain.chain(char.enter_arena_chain, arena)
            .chain(this.enter_chain, { char, arena });
            await enter_chain.trigger(char, () => {
                HR.onEnter(char, arena);
            });
            await p_master.addMana(-this.getEnterCost(char, arena));
            await p_master.changeCharTired(char, true);
            return true;
        } else {
            throwIfIsBackend("進入程序取消");
            return false;
        }
    }
    getExploitCost(arena: IArena, char: ICharacter|Player) {
        let get_cost_chain = arena.get_exploit_cost_chain
        .chain(this.get_exploit_cost_chain, { arena, char });
        if(TG.isCard(char)) {
            get_cost_chain.chain(char.get_exploit_cost_chain, arena);
        }
        return get_cost_chain.trigger(arena.basic_exploit_cost, char);
    }
    /** 這應該是難得不用跟前端還有選擇器糾纏不清的函式了= = */
    async exploit(arena: IArena, char: ICharacter|Player) {
        let p_master = this.getMyMaster(char);
        let cost = this.getExploitCost(arena, char);
        if(HR.checkExploit(arena, char, p_master.mana, cost)) {
            let exploit_chain = arena.exploit_chain
            .chain(this.exploit_chain, { arena, char });
            if(TG.isCard(char)) {
                exploit_chain.chain(char.exploit_chain, arena);
            }
            if(exploit_chain.checkCanTrigger(char)) {
                await p_master.addMana(-cost);
                await exploit_chain.trigger(char, async () => {
                    let income = await arena.onExploit(char);
                    if(income) {
                        p_master.addMana(income);
                    }
                });
            }
        }
    }
    repulse(loser: ICharacter, winner: ICharacter|null) {
        // TODO:
    }
    getAll<T extends IKnownCard>(guard: (c: IKnownCard) => c is T, filter?: (c: T) => boolean) {
        let list = new Array<T>();
        for(let seq in this.card_table) {
            let c = this.card_table[seq];
            if(guard(c)) {
                if(c.card_status == CardStat.Onboard) {
                    if(!filter || filter(c)) {
                        list.push(c);
                    }
                }
            }
        }
        return list;
    }

    public readonly get_enter_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter }>();
    public readonly enter_chain = new ActionChain< { arena: IArena, char: ICharacter }>();
    public readonly get_exploit_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter | Player }>();
    public readonly exploit_chain = new ActionChain<{ arena: IArena, char: ICharacter | Player }>();

    public readonly battle_start_chain = new ActionChain<IArena>();
    public readonly get_battle_cost_chain = new GetterChain<number, IArena>();
    public readonly battle_end_chain = new ActionChain<null>();

    public readonly before_conflict_chain
        = new ActionChain<{ def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly conflict_chain
        = new ActionChain<{ def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly repluse_chain
        = new ActionChain<{ loser: ICharacter, winner: ICharacter | null }>();

    /** 主階段結束，開始收穫階段之前 */
    public readonly main_phase_end_chain = new ActionChain<null>();
    /** 收穫階段結束之後 */
    public readonly era_end_chain = new ActionChain<null>();
}

export {
    GameMaster, BadOperationError, PlayerMaster
};