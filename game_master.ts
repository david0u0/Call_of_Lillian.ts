// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CardType, CharStat } from "./enums";
import { ICard, ICharacter, IUpgrade, ISpell, IArena, IEvent } from "./interface";
import { EventChain, HookResult } from "./hook";
import { throwIfIsBackend, BadOperationError } from "./errors";
import Selecter from "./selecter";

class PlayerMaster {
    private _mana = 0;
    private _emo = 0;
    private _deck = new Array<ICard>();
    private _hand = new Array<ICard>();
    private _gravyard = new Array<ICard>();
    private _characters = new Array<ICharacter>();
    private _arenas = new Array<IArena>();
    private _events_ongoing = new Array<IEvent>();
    private _events_succeeded = new Array<IEvent>();
    private _events_failed = new Array<IEvent>();
    public get mana() { return this._mana };
    public get emo() { return this._emo };
    public get deck() { return [...this._deck] };
    public get characters() { return [...this._characters] };

    constructor(public readonly player: Player) {
        this.card_play_chain.appendCheck(card => {
            if(card.card_type == CardType.Upgrade) {
                // 打出升級卡的規則
                let upgrade = card as IUpgrade;
                if (upgrade.character_equipped) {
                    if (upgrade.character_equipped.card_status != CardStat.Onboard) {
                        throwIfIsBackend("指定的角色不在場上", upgrade)
                        return { intercept_effect: true };
                    } else if (upgrade.character_equipped.char_status != CharStat.StandBy) {
                        throwIfIsBackend("指定的角色不在待命區", upgrade)
                        return { intercept_effect: true };
                    } else {
                    }
                } else {
                    throwIfIsBackend("未指定角色就打出升級", upgrade)
                    return { intercept_effect: true };
                }
            }
        });
        this.card_play_chain.append(card => {
            if(card.card_type == CardType.Upgrade) {
                // 打出升級卡的規則
                let upgrade = card as IUpgrade;
                if(upgrade.character_equipped) {
                    upgrade.character_equipped.addUpgrade(upgrade);
                }
            } else if(card.card_type == CardType.Character) {
                // 打出角色的規則
                let char = card as ICharacter;
                this.addCharacter(char);
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
            this._emo -= result_arg;
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
        return card.card_play_chain.chain(this.card_play_chain,
            tmp => card , c => null).checkCanTrigger(null);
    }
    /**
     * @param card 
     * @returns 一個布林值，true 代表順利執行，false 代表整個效果應中斷。
     */
    playCard(card: ICard) {
        if(card.card_status != CardStat.Hand) {
            throw new BadOperationError("試圖打出不在手上的牌");
        }
        card.initialize();
        // TODO: 這裡應該先執行 card_play_chain.checkCanTrigger，因為觸發的效果很可能有副作用。
        // 用 intercept_effect 來解決是行不通的，傷害已經造成了！
        let result = card.card_play_chain.chain(this.card_play_chain,
            tmp => card , c => null).trigger(null);
        if(result.intercept_effect) {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            card.recoverCancelPlay();
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
        } else {
            card.card_status = CardStat.Onboard;
        }
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
        // TODO:
        return c;
    }

    private p_master1: PlayerMaster = new PlayerMaster(Player.Player1);
    private p_master2: PlayerMaster = new PlayerMaster(Player.Player2);
    getMyMaster(arg: ICard|Player): PlayerMaster {
        if(typeof arg != "number") {
            return this.getMyMaster(arg.owner);
        }
        else if(arg == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(arg: ICard|Player): PlayerMaster {
        if(typeof arg != "number") {
            return this.getEnemyMaster(arg.owner);
        }
        else if(arg == Player.Player2) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    public readonly battle_start_chain: EventChain<number> = new EventChain<number>();
    public readonly battle_end_chain: EventChain<number> = new EventChain<number>();
}

export {
    GameMaster, BadOperationError, throwIfIsBackend
}