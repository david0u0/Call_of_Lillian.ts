// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat } from "./enums";
import { ICard, ICharacter, IArena, IEvent, TypeGaurd as TG } from "./interface";
import { EventChain, HookResult } from "./hook";
import { throwIfIsBackend, BadOperationError } from "./errors";
import { SoftRule as SR, HardRule as HR, Constant as C } from "./general_rules";

import Selecter from "./selecter";

class PlayerMaster {
    private _mana = 0;
    private _emo = 0;
    private _deck = new Array<ICard>();
    private _hand = new Array<ICard>();
    private _gravyard = new Array<ICard>();
    private _characters = new Array<ICharacter>();
    private _arenas = new Array<IArena>(C.MAX_ARENA);
    private _events_ongoing = new Array<IEvent>();
    private _events_finished = new Array<IEvent>();
    public get mana() { return this._mana };
    public get emo() { return this._emo };
    public get deck() { return [...this._deck] };
    public get characters() { return [...this._characters] };
    public get arenas() { return [...this._arenas] };

    constructor(public readonly player: Player, private readonly selecter: Selecter) {
        SR.checkPlay(this.card_play_chain);
        SR.onGetBattleRole(this.get_battle_role_chain, this.getStrength.bind(this));
        SR.onFail(this.fail_chain, () => this.mana,
            this.addMana.bind(this), this.addEmo.bind(this));
        SR.checkPush(this.push_chain);
        SR.onFinish(this.finish_chain, this.retireCard.bind(this));
        SR.onGetManaCost(this.get_mana_cost_chain, this.arenas);
    }
    
    public card_play_chain: EventChain<null, ICard> = new EventChain();
    public card_retire_chain: EventChain<null, ICard> = new EventChain();

    public set_mana_chain: EventChain<number, null> = new EventChain();
    public set_emo_chain: EventChain<number, null> = new EventChain();

    public fail_chain = new EventChain<null, IEvent>();
    public get_push_cost_chain = new EventChain<number, { char: ICharacter|null, event: IEvent }>();
    public push_chain = new EventChain<null, { char: ICharacter|null, event: IEvent }>();
    public finish_chain = new EventChain<null, { char: ICharacter|null, event: IEvent }>();

    public get_strength_chain
        = new EventChain<number, ICharacter>();
    public get_inconflict_strength_chain
        = new EventChain<number, { me: ICharacter, enemy: ICharacter }>();
    public get_mana_cost_chain
        = new EventChain<number, ICard>();
    public get_battle_role_chain
        = new EventChain<BattleRole, ICharacter>();

    addToDeck(card: ICard) {
        // TODO: 加上事件鏈?
        this._deck.push(card);
    }
    addToHand(card: ICard) {
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

    addEmo(n: number) {
        let new_emo = Math.max(0, this.emo + n);
        this.set_emo_chain.trigger(new_emo, null, new_emo => {
            this._emo = new_emo;
        });
    }

    getManaCost(card: ICard): number {
        return card.get_mana_cost_chain.chain(this.get_mana_cost_chain, card)
            .trigger(card.basic_mana_cost, null);
    }

    addMana(n: number) {
        let new_mana = Math.max(0, this.mana + n);
        this.set_mana_chain.trigger(new_mana, null, new_mana => {
            this._mana = new_mana;
        });
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

    checkCanPlay(card: ICard): boolean {
        if(HR.checkPlay(this.player, card, this.mana, this.getManaCost(card))) {
            return card.card_play_chain.chain(this.card_play_chain, card)
                .checkCanTrigger(null);
        } else {
            return false;
        }
    }
    playCard(card: ICard) {
        card.rememberFields();
        if(!card.initialize() || !this.checkCanPlay(card)) {
            card.recoverFields();
            return;
        }
        this.addMana(-this.getManaCost(card));
        card.card_play_chain.chain(this.card_play_chain, card).trigger(null, null, () => {
            card.card_status = CardStat.Onboard;
            card.onPlay();
            HR.onPlay(card, this.addCharacter.bind(this),
                this.addEvent.bind(this));
        }, () => {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverFields();
        });
    }
    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    private _leaveCard(card: ICard) {
        card.card_leave_chain.trigger(null, null);
        HR.onLeave(card, this.retireCard.bind(this));
    }
    retireCard(card: ICard) {
        if(card.card_status == CardStat.Onboard) {
            let chain = card.card_retire_chain.chain(this.card_retire_chain, card);
            let can_die = chain.checkCanTrigger(null);
            if (can_die) {
                this._leaveCard(card);
                chain.trigger(null, null, () => {
                    card.card_status = CardStat.Retired;
                });
            }
        } else {
            throwIfIsBackend("重複銷毀一張卡片", card);
        }
    }
    exileCard(card: ICard) {
        this._leaveCard(card);
        card.card_status = CardStat.Exile;
    }

    addCharacter(char: ICharacter) {
        this._characters.push(char);
    }
    addEvent(event: IEvent) {
        this._events_ongoing.push(event);
    }

    // 底下這些處理事件卡的函式先不考慮「推進別人的事件」這種狀況
    failEvent(event: IEvent) {
        this.fail_chain.trigger(null, event, () => {
            event.onFail();
            this.retireCard(event);
        });
    }

    finishEvent(char: ICharacter|null, event: IEvent) {
        // 應該不太需要 checkCanTrigger 啦 @@
        this.retireCard(event);
        this.finish_chain.trigger(null, { char, event }, () => {
            event.onFinish(char);
            this.retireCard(event);
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
    pushEvent(char: ICharacter|null) {
        let push_chain = new EventChain<null, ICharacter|null>();
        let cost = 0;
        let _event = this.selecter.selectSingleCard(TG.isEvent, event => {
            cost = this.getPushCost(char, event);
            if(HR.checkPush(event, char, this.mana, cost)) {
                return false;
            } else {
                push_chain = event.push_chain.chain(this.push_chain, { event, char });
                if(TG.isCard(char)) {
                    push_chain.chain(char.push_chain, event);
                }
                return push_chain.checkCanTrigger(char);
            }
        });

        if(_event) {
            let event = _event;
            this.addMana(-cost);
            if(char) {
                char.is_tired = true;
            }
            push_chain.trigger(null, char, () => {
                HR.onPushEvent(event);
                event.onPush(char);
                if(event.cur_progress_count == event.goal_progress_count) {
                    // 事件已完成
                    this.finishEvent(char, event);
                }
            });
        }
    }
}

class GameMaster {
    private _cur_seq = 1;
    public readonly card_table: { [index: number]: ICard } = {};
    public readonly selecter = new Selecter(this.card_table);
    getSeqNumber(): number {
        return this._cur_seq++;
    }
    genCard(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => ICard
    ): ICard {
        let c = card_constructor(this.getSeqNumber(), owner, this);
        this.card_table[c.seq] = c;
        return c;
    }
    genCardToDeck(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => ICard
    ): ICard {
        let c = this.genCard(owner, card_constructor);
        this.getMyMaster(owner).addToDeck(c);
        return c;
    }
    genCardToHand(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => ICard
    ): ICard {
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
        return arena;
    }

    private p_master1: PlayerMaster = new PlayerMaster(Player.Player1, this.selecter);
    private p_master2: PlayerMaster = new PlayerMaster(Player.Player2, this.selecter);
    getMyMaster(arg: Player|ICard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getMyMaster(arg.owner);
        } else if (arg == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(arg: Player|ICard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getEnemyMaster(arg.owner);
        } else if (arg == Player.Player2) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }

    constructor() {
        SR.onGetEnterCost(this.get_enter_cost_chain);
        SR.checkEnter(this.enter_chain);
        SR.onEnter(this.enter_chain, (p, mana) => {
            this.getMyMaster(p).addMana(mana);
        });
        SR.checkExploit(this.exploit_chain);
    }

    getEnterCost(char: ICharacter, arena: IArena): number {
        // NOTE: 觸發順序：場所 -> 角色 -> 世界
        return arena.get_enter_cost_chain.chain(char.get_enter_cost_chain, arena)
            .chain(this.get_enter_cost_chain, { char, arena })
            .trigger(0, char);
    }
    enterArena(char: ICharacter) {
        let p_master = this.getMyMaster(char);
        let _arena = this.selecter.selectSingleCard(TG.isArena, arena => {
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
            p_master.addMana(-this.getEnterCost(char, arena));
            char.is_tired = true; // 使角色疲勞
            enter_chain.trigger(null, char, () => {
                HR.onEnter(char, arena);
            });
        } else {
            throwIfIsBackend("進入程序取消");
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
    exploit(arena: IArena, char: ICharacter|Player) {
        let p_master = this.getMyMaster(char);
        let cost = this.getExploitCost(arena, char);
        if(HR.checkExploit(arena, char, p_master.mana, cost)) {
            let exploit_chain = arena.exploit_chain
                .chain(this.exploit_chain, { arena, char });
            if(TG.isCard(char)) {
                exploit_chain.chain(char.exploit_chain, arena);
            }
            if(exploit_chain.checkCanTrigger(char)) {
                p_master.addMana(-cost);
                exploit_chain.trigger(null, char, t => {
                    let income = arena.onExploit(char);
                    if (income) {
                        p_master.addMana(income);
                    }
                });
            }
        }
    }
    repulse(loser: ICharacter, winner: ICharacter|null) {
        // TODO:
    }
    getAll<T extends ICard>(guard: (c: ICard) => c is T, filter=(c: T) => true) {
        let list = new Array<T>();
        for(let seq in this.card_table) {
            let c = this.card_table[seq];
            if (guard(c)) {
                if (c.card_status == CardStat.Onboard) {
                    if (filter(c)) {
                        list.push(c);
                    }
                }
            }
        }
        return list;
    }

    public readonly get_enter_cost_chain = new EventChain<number, { arena: IArena, char: ICharacter }>();
    public readonly enter_chain = new EventChain<null, { arena: IArena, char: ICharacter }>();
    public readonly get_exploit_cost_chain = new EventChain<number, { arena: IArena, char: ICharacter|Player }>();
    public readonly exploit_chain = new EventChain<null, { arena: IArena, char: ICharacter|Player }>();

    public readonly battle_start_chain = new EventChain<null, IArena>();
    public readonly get_battle_cost_chain = new EventChain<number, IArena>();
    public readonly battle_end_chain = new EventChain<null, null>();

    public readonly before_conflict_chain
        = new EventChain<null, { def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly conflict_chain
        = new EventChain<null, { def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly repluse_chain
        = new EventChain<null, { loser: ICharacter, winner: ICharacter|null }>();

    public readonly era_end_chain = new EventChain<null, null>();
}

export {
    GameMaster, BadOperationError, PlayerMaster
}