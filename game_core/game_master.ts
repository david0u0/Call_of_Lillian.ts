// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat } from "./enums";
import { ICard, ICharacter, IUpgrade, ISpell, IArena, IEvent, TypeGaurd } from "./interface";
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
        this.card_play_chain.appendCheck(card => {
            if(TypeGaurd.isUpgrade(card)) {
                // 打出升級卡的規則
                if (card.character_equipped) {
                    if (card.character_equipped.card_status != CardStat.Onboard) {
                        throwIfIsBackend("指定的角色不在場上", card);
                        return { intercept_effect: true };
                    } else if (card.character_equipped.char_status != CharStat.StandBy) {
                        throwIfIsBackend("指定的角色不在待命區", card);
                        return { intercept_effect: true };
                    } else if(card.character_equipped.owner != card.owner) {
                        throwIfIsBackend("指定的角色不屬於你", card);
                        return { intercept_effect: true };
                    }
                } else {
                    throwIfIsBackend("未指定角色就打出升級", card);
                    return { intercept_effect: true };
                }
            }
        });
        this.card_play_chain.append(card => {
            if(TypeGaurd.isUpgrade(card)) {
                // 打出升級卡的規則
                if(card.character_equipped) {
                    let char = card.character_equipped;
                    char.addUpgrade(card);
                    card.card_leave_chain.append(tmp => {
                        char.distroyUpgrade(card);
                    });
                }
            } else if(TypeGaurd.isCharacter(card)) {
                // 打出角色後把她加入角色區
                this.addCharacter(card);
                // 角色離場時銷毀所有裝備
                card.card_leave_chain.append(arg => {
                    for (let u of card.upgrade_list) {
                        this.retireCard(u);
                    }
                });
            } else if(TypeGaurd.isArena(card)) {
                // 打出場所的規則（把之前的建築拆了）
                // TODO:
            }
        });
        this.get_mana_cost_chain.append(arg => {
            let card = arg.card;
            if(TypeGaurd.isArena(card)) {
                // 改建場所的花費下降
                let og_arena = this._arenas[card.positioin];
                let cost = Math.max(card.basic_mana_cost - og_arena.basic_mana_cost, 0);
                return { result_arg: { ...arg, cost }};
            }
        });
        // 計算戰鬥職位的通則
        this.get_battle_role_chain.append(arg => {
            let role = arg.role;
            if(this.getStrength(arg.char) == 0) {
                role = BattleRole.Civilian;
            }
            return { result_arg: { role, char: arg.char }};
        });
    }
    
    public card_play_chain: EventChain<ICard> = new EventChain();
    public card_retire_chain: EventChain<ICard> = new EventChain();

    public set_mana_chain: EventChain<number> = new EventChain();
    public set_emo_chain: EventChain<number> = new EventChain();

    public get_strength_chain
        = new EventChain<{ strength: number, char: ICharacter }>();
    public get_infight_strength_chain
        = new EventChain<{ strength: number, me: ICharacter, enemy: ICharacter }>();
    public get_mana_cost_chain
        = new EventChain<{ cost: number, card: ICard }>();
    public get_battle_role_chain
        = new EventChain<{ role: BattleRole, char: ICharacter }>();

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
        let { result_arg, intercept_effect } = this.set_emo_chain.trigger(new_emo);
        if(!intercept_effect) {
            this._emo = result_arg;
        }
    }

    getManaCost(card: ICard): number {
        return card.get_mana_cost_chain.chain(this.get_mana_cost_chain,
            cost => {
                return { cost, card };
            },
            result => result.cost).trigger(card.basic_mana_cost).result_arg;
    }

    setMana(new_mana: number) {
        new_mana = new_mana > 0 ? new_mana : 0;
        let { result_arg, intercept_effect } = this.set_mana_chain.trigger(new_mana);
        if(!intercept_effect) {
            this._mana = result_arg;
        }
    }

    getStrength(char: ICharacter) {
        let strength = char.basic_strength;
        for(let u of char.upgrade_list) {
            strength += u.basic_strength;
        }
        return char.get_strength_chain.chain(this.get_strength_chain, strength => {
            return { strength, char };
        }, result => {
            return result.strength;
        }).trigger(strength).result_arg;
    }
    
    getBattleRole(char: ICharacter) {
        return char.get_battle_role_chain.chain(this.get_battle_role_chain, role => {
            return { role, char };
        }, result => {
            return result.role;
        }).trigger(char.basic_battle_role).result_arg;
    }

    checkCanPlay(card: ICard): boolean {
        if(card.card_status != CardStat.Hand) {
            return false;
        } else {
            return card.card_play_chain.chain(this.card_play_chain,
                tmp => card, c => null).checkCanTrigger(null);
        }
    }
    playCard(card: ICard) {
        card.initialize();
        let cost = this.getManaCost(card);
        if(this.mana < cost) {
            throw new BadOperationError("魔力不夠還想出牌？");
        } else if(!this.checkCanPlay(card)) {
            throw new BadOperationError("沒通過出牌檢查還想出牌？");
        }
        // TODO: 這裡應該先執行 card_play_chain.checkCanTrigger，因為觸發的效果很可能有副作用。
        // 用 intercept_effect 來解決是行不通的，傷害已經造成了！
        let result = card.card_play_chain.chain(this.card_play_chain,
            tmp => card , c => null).trigger(null);
        if(result.intercept_effect) {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverFields();
        } else {
            this.setMana(this.mana - cost);
            card.card_status = CardStat.Onboard;
            card.onPlay();
        }
    }
    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    private _leaveCard(card: ICard) {
        card.card_leave_chain.trigger(null);
    }
    retireCard(card: ICard) {
        if(card.card_status == CardStat.Onboard) {
            let chain = card.card_retire_chain.chain(this.card_retire_chain,
                tmp => card, c => null);
            let can_die = chain.checkCanTrigger(null);
            if (can_die) {
                this._leaveCard(card);
                chain.trigger(null);
                card.card_status = CardStat.Retired;
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
        this.get_enter_cost_chain.append(arg => {
            if (arg.char.owner != arg.arena.owner) {
                return { result_arg: { ...arg, cost: arg.cost + ENTER_ENEMY_COST }};
            }
        });
        this.enter_chain.appendCheck(arg => {
            if(arg.char.char_status != CharStat.StandBy) {
                // 理論上，在場所中的角色不能移動
                throwIfIsBackend("場所中的角色不能移動");
                return { intercept_effect: true };
            } else if(arg.char.is_tired) {
                // 理論上，疲勞中的角色不能移動
                throwIfIsBackend("疲勞中的角色不能移動");
                return { intercept_effect: true };
            }
        });
    }

    getEnterCost(char: ICharacter): number {
        let _arena = char.arena_entered;
        if(!_arena) {
            throwIfIsBackend("沒有指定場所就想算進入的花費");
            return 0;
        } else {
            let arena = _arena;
            // NOTE: 觸發順序：場所 -> 角色 -> 世界
            return arena.get_enter_cost_chain.chain(char.get_enter_cost_chain, arg => {
                return { cost: arg.cost, arena };
            }, arg => {
                return { cost: arg.cost, char };
            }).chain(this.get_enter_cost_chain, arg => {
                return { cost: arg.cost, arena, char };
            }, arg => {
                return { cost: arg.cost, char };
            }).trigger({ char, cost: 0 }).result_arg.cost;
        }
    }
    enterArena(char: ICharacter) {
        if(char.card_status != CardStat.Onboard) {
            throw new BadOperationError("欲進入場所的角色不在場上");
        }

        let arena = this.selecter.selectCard(TypeGaurd.isArena, 1, 1, arena => {
            if(arena.char_list.length + 1 > arena.max_capacity) {
                throwIfIsBackend("欲進入的場所人數已達上限");
                return false;
            } else if(arena.card_status != CardStat.Onboard) {
                throw new BadOperationError("欲進入的場所不在場上");
                return false;
            } else {
                return true;
            }
        })[0];

        // NOTE: 其實下面這段是不是可以整個放進上面的選擇器裡？
        char.rememberFields();
        
        char.arena_entered = arena;
        let cost = this.getEnterCost(char);
        let p_master = this.getMyMaster(char);
        if(cost > p_master.mana) {
            char.recoverFields();
            throwIfIsBackend("魔不夠就想進入場所");
        } else {
            let enter_chain = arena.enter_chain.chain(char.enter_chain,
                arg => arena, arg => char
            ).chain(this.enter_chain, arg => {
                return { arena, char };
            }, arg => char);
            if(enter_chain.checkCanTrigger(char)) {
                p_master.setMana(p_master.mana - cost);
                enter_chain.trigger(char);
                char.char_status = CharStat.InArena;
                arena.enter(char);
            } else {
                char.recoverFields();
                throwIfIsBackend("未通過進入場所的檢查");
            }
        }
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

    repulse(loser: ICharacter, winner: ICharacter|null) {
        // TODO:
    }

    public readonly get_enter_cost_chain = new EventChain<{ cost: number, arena: IArena, char: ICharacter }>();
    public readonly enter_chain = new EventChain<{ arena: IArena, char: ICharacter }>();
    public readonly get_exploit_cost_chain = new EventChain<{ cost: number, arena: IArena, char: ICharacter }>();
    public readonly exploit_chain = new EventChain<{ arena: IArena, char: ICharacter }>();

    public readonly battle_start_chain = new EventChain<IArena>();
    public readonly get_battle_cost_chain = new EventChain<{ cost: number, arena: IArena}>();
    public readonly battle_end_chain = new EventChain<null>();

    public readonly before_conflict_chain
        = new EventChain<{ def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly conflict_chain
        = new EventChain<{ def: ICharacter, atk: ICharacter, is_blocked: boolean }>();
    public readonly repluse_chain
        = new EventChain<{ loser: ICharacter, winner: ICharacter|null }>();

    public readonly season_end_chain = new EventChain<null>();
}

export {
    GameMaster, BadOperationError, throwIfIsBackend
}