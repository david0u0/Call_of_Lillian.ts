// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat } from "./enums";
import { ICard, ICharacter, IUpgrade, ISpell, IArena, IEvent, TypeGaurd as TG } from "./interface";
import { EventChain, HookResult } from "./hook";
import { throwIfIsBackend, BadOperationError } from "./errors";
import Selecter from "./selecter";

const MAX_ARENA = 5;
const ENTER_ENEMY_COST = 1;

class PlayerMaster {
    private _mana = 0;
    private _emo = 0;
    private _deck = new Array<ICard>();
    private _hand = new Array<ICard>();
    private _gravyard = new Array<ICard>();
    private _characters = new Array<ICharacter>();
    private _arenas = new Array<IArena>(MAX_ARENA);
    private _events_ongoing = new Array<IEvent>();
    private _events_succeeded = new Array<IEvent>();
    private _events_failed = new Array<IEvent>();
    public get mana() { return this._mana };
    public get emo() { return this._emo };
    public get deck() { return [...this._deck] };
    public get characters() { return [...this._characters] };
    public get arenas() { return [...this._arenas] };

    constructor(public readonly player: Player) {
        this.card_play_chain.appendCheck((can_play, card) => {
            if(TG.isUpgrade(card)) {
                // 打出升級卡的規則
                if (card.character_equipped) {
                    if (card.character_equipped.card_status != CardStat.Onboard) {
                        throwIfIsBackend("指定的角色不在場上", card);
                        return { var_arg: false };
                    } else if (card.character_equipped.char_status != CharStat.StandBy) {
                        throwIfIsBackend("指定的角色不在待命區", card);
                        return { var_arg: false };
                    } else if(card.character_equipped.owner != card.owner) {
                        throwIfIsBackend("指定的角色不屬於你", card);
                        return { var_arg: false };
                    }
                } else {
                    throwIfIsBackend("未指定角色就打出升級", card);
                    return { var_arg: true };
                }
            }
        });
        this.card_play_chain.append((t, card) => {
            if(TG.isUpgrade(card)) {
                // 打出升級卡的規則
                if(card.character_equipped) {
                    let char = card.character_equipped;
                    char.addUpgrade(card);
                    card.card_leave_chain.append(tmp => {
                        char.distroyUpgrade(card);
                    });
                }
            } else if(TG.isCharacter(card)) {
                // 打出角色後把她加入角色區
                this.addCharacter(card);
                // 角色離場時銷毀所有裝備
                card.card_leave_chain.append(arg => {
                    for (let u of card.upgrade_list) {
                        this.retireCard(u);
                    }
                });
            } else if(TG.isArena(card)) {
                // 打出場所的規則（把之前的建築拆了）
                // TODO:
            }
        });
        this.get_mana_cost_chain.append((cost, card) => {
            if(TG.isArena(card)) {
                // 改建場所的花費下降
                let og_arena = this._arenas[card.position];
                cost = Math.max(cost - og_arena.basic_mana_cost, 0);
                return { var_arg: cost };
            }
        });
        // 計算戰鬥職位的通則
        this.get_battle_role_chain.append((role, char) => {
            if(this.getStrength(char) == 0) {
                return { var_arg: BattleRole.Civilian };
            }
        });
    }
    
    public card_play_chain: EventChain<null, ICard> = new EventChain();
    public card_retire_chain: EventChain<null, ICard> = new EventChain();

    public set_mana_chain: EventChain<number, null> = new EventChain();
    public set_emo_chain: EventChain<number, null> = new EventChain();

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

    setEmo(new_emo: number) {
        this.set_emo_chain.trigger(new_emo, null, new_emo => {
            this._emo = new_emo;
        });
    }

    getManaCost(card: ICard): number {
        return card.get_mana_cost_chain.chain(this.get_mana_cost_chain, card)
            .trigger(card.basic_mana_cost, null);
    }

    setMana(new_mana: number) {
        new_mana = new_mana > 0 ? new_mana : 0;
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
        if(card.owner != this.player) {
            throw new BadOperationError("你想出對手的牌！！？", card);
        } else if(card.card_status != CardStat.Hand) {
            throw new BadOperationError("牌不在手上還想出牌？", card);
        } else if(this.mana < this.getManaCost(card)) {
            throwIfIsBackend("魔力不夠還想出牌？", card);
            return false;
        } else {
            return card.card_play_chain.chain(this.card_play_chain, card)
                .checkCanTrigger(null);
        }
    }
    playCard(card: ICard) {
        card.rememberFields();
        if(!card.initialize() || !this.checkCanPlay(card)) {
            card.recoverFields();
            return;
        }
        this.setMana(this.mana - this.getManaCost(card));
        card.card_play_chain.chain(this.card_play_chain, card).trigger(null, null, () => {
            card.card_status = CardStat.Onboard;
            card.onPlay();
        }, () => {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverFields();
        });
    }
    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    private _leaveCard(card: ICard) {
        card.card_leave_chain.trigger(null, null);
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

    private p_master1: PlayerMaster = new PlayerMaster(Player.Player1);
    private p_master2: PlayerMaster = new PlayerMaster(Player.Player2);
    getMyMaster(arg: ICard | Player): PlayerMaster {
        if (typeof arg != "number") {
            return this.getMyMaster(arg.owner);
        }
        else if (arg == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(arg: ICard | Player): PlayerMaster {
        if (typeof arg != "number") {
            return this.getEnemyMaster(arg.owner);
        }
        else if (arg == Player.Player2) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }

    constructor() {
        // 進入別人的場所要支付代價
        this.get_enter_cost_chain.append((cost, arg) => {
            if (arg.char.owner != arg.arena.owner) {
                return { var_arg: cost + ENTER_ENEMY_COST };
            }
        });
        this.enter_chain.appendCheck((can_enter, arg) => {
            if(arg.char.char_status != CharStat.StandBy) {
                // 理論上，在場所中的角色不能移動
                throwIfIsBackend("場所中的角色不能移動");
                return { var_arg: false };
            } else if(arg.char.is_tired) {
                // 理論上，疲勞中的角色不能移動
                throwIfIsBackend("疲勞中的角色不能移動");
                return { var_arg: false };
            }
        });
    }

    getEnterCost(char: ICharacter, arena: IArena): number {
        // NOTE: 觸發順序：場所 -> 角色 -> 世界
        return arena.get_enter_cost_chain.chain(char.get_enter_cost_chain, arena)
            .chain(this.get_enter_cost_chain, { char, arena })
            .trigger(0, char);
    }
    enterArena(char: ICharacter) {
        if (char.card_status != CardStat.Onboard) {
            throw new BadOperationError("欲進入場所的角色不在場上");
        }
        let p_master = this.getMyMaster(char);
        let _arena = this.selecter.selectSingleCard(TG.isArena, arena => {
            if(arena.char_list.length + 1 > arena.max_capacity) {
                throwIfIsBackend("欲進入的場所人數已達上限");
                return false;
            } else if(arena.card_status != CardStat.Onboard) {
                throwIfIsBackend("欲進入的場所不在場上");
                return false;
            } else {
                if(this.getEnterCost(char, arena) > p_master.mana) {
                    throwIfIsBackend("魔不夠就想進入場所");
                    return false;
                } else {
                    return arena.enter_chain.chain(char.enter_arena_chain, arena)
                        .chain(this.enter_chain, { char, arena }).checkCanTrigger(char);
                }
            }
        });

        // NOTE: 否則代表進入程序取消
        if(_arena) {
            let arena = _arena;
            let enter_chain = arena.enter_chain.chain(char.enter_arena_chain, arena)
                .chain(this.enter_chain, { char, arena });
            if(enter_chain.checkCanTrigger(char)) {
                p_master.setMana(p_master.mana - this.getEnterCost(char, arena));
                enter_chain.trigger(null, char, () => {
                    char.char_status = CharStat.InArena;
                    char.arena_entered = arena;
                    arena.enter(char);
                });
            } else {
                throwIfIsBackend("未通過進入場所的檢查");
            }
        }
    }
    getExploitCost(char: ICharacter, arena: IArena) {
        return arena.get_exploit_cost_chain.chain(char.get_exploit_cost_chain, arena)
            .chain(this.get_exploit_cost_chain, { arena, char })
            .trigger(arena.basic_exploit_cost, char);
    }
    /** 這應該是難得不用跟前端糾纏不清的函式了= = */
    exploit(char: ICharacter) {
        if(!char.arena_entered) {
            throw new BadOperationError("不在場所的角色無法開發資源", char);
        } else {
            let arena = char.arena_entered;
            let cost = this.getExploitCost(char, arena);
            let p_master = this.getMyMaster(char);
            if(cost > p_master.mana) {
                throw new BadOperationError("魔不夠就想開發場所資源？");
            } else {
                let exploit_chain = arena.exploit_chain.chain(char.exploit_chain, arena)
                    .chain(this.exploit_chain, { arena, char });
                if(exploit_chain.checkCanTrigger(char)) {
                    p_master.setMana(p_master.mana - cost);
                    exploit_chain.trigger(null, char, t => {
                        let income = arena.onExploit(char);
                        if(income) {
                            p_master.setMana(p_master.mana + income);
                        }
                    });
                }
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
    public readonly get_exploit_cost_chain = new EventChain<number, { arena: IArena, char: ICharacter }>();
    public readonly exploit_chain = new EventChain<null, { arena: IArena, char: ICharacter }>();

    public readonly battle_start_chain = new EventChain<null, IArena>();
    public readonly get_battle_cost_chain = new EventChain<number, IArena>();
    public readonly battle_end_chain = new EventChain<null, null>();

    public readonly before_conflict_chain
        = new EventChain<null, { def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly conflict_chain
        = new EventChain<null, { def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly repluse_chain
        = new EventChain<null, { loser: ICharacter, winner: ICharacter|null }>();

    public readonly season_end_chain = new EventChain<null, null>();
}

export {
    GameMaster, BadOperationError, throwIfIsBackend
}