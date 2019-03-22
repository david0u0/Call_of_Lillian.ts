import { Player, CardStat, BattleRole } from "./enums";
import { ICard, ICharacter, IUpgrade, ISpell, IArena, IEvent } from "./interface";
import { EventChain, HookResult } from "./hook";

/** 發生錯誤操作，理想上應該會被UI檔下來，會出現這個錯誤代表玩家繞過UI直接對伺服器說話 */
class BadOperationError {
    constructor(public message: string) {
        Error.apply(this, [message]);
    }
}

class PlayerMaster {
    private _mana: number;
    private _emo: number;
    private _deck: ICard[];
    private _hand: ICard[];
    private _gravyard: ICard[];
    private _characters: ICharacter[];
    private _arenas: IArena[];
    private _events: IEvent[];
    public get mana() { return this._mana };
    public get emo() { return this._emo };
    public get deck() { return [...this._deck] };
    public get characters() { return [...this._characters] };

    constructor(public readonly player: Player) {
        this._mana = 0;
        this._emo = 0;
        this._deck = [];
        this._hand = [];
        this._gravyard = [];
        this._characters = [];
        this._arenas = [];
        this._events = [];
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
    public get_battal_role_chain
        = new EventChain<{ role: BattleRole, char: ICharacter }>();

    addToDeck(card: ICard) {
        // TODO: 加上事件鏈?
        this._deck.push(card);
    }
    draw() {
        // TODO: 加上事件鏈?
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

    getManaCost(card: ICard) {
        let arg = { cost: card.basic_mana_cost, card };
        let { result_arg } = this.get_mana_cost_chain.trigger(arg);
        return card.get_mana_cost_chain.trigger(result_arg.cost).result_arg;
    }

    setMana(new_mana: number) {
        new_mana = new_mana > 0 ? new_mana : 0;
        let { result_arg, intercept_effect } = this.set_mana_chain.trigger(new_mana);
        if(!intercept_effect) {
            this._mana = result_arg;
        }
    }

    getStrength(char: ICharacter) {
        let strength = char.get_strength_chain.trigger(char.basic_strength).result_arg;
        let result = this.get_strength_chain.trigger({ strength, char });
        return result.result_arg.strength;
    }
    
    getBattleRole(char: ICharacter) {
        let role = char.get_battle_role_chain.trigger(char.basic_battle_role).result_arg;
        let result = this.get_battal_role_chain.trigger({ role, char });
        return result.result_arg.role;
    }

    /**
     * @param card 
     * @returns 一個布林值，true 代表順利執行，false 代表整個效果應中斷。
     */
    playCard(card: ICard): boolean {
        if(card.card_status != CardStat.Hand) {
            throw new BadOperationError("試圖打出不在手上的牌");
        }
        let { intercept_effect } = this.card_play_chain.trigger(card);
        if(!intercept_effect) {
            ({ intercept_effect } = card.card_play_chain.trigger(null));
        }
        if(intercept_effect) {
            return false; // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
        } else {
            card.card_status = CardStat.Onboard;
            return true;
        }
    }

    addCharacter(char: ICharacter) {
        this._characters.push(char);
    }

}

class GameMaster {
    private _cur_seq = 1;
    getSeqNumber(): number {
        return this._cur_seq++;
    }
    genCardToDeck(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => ICard
    ): ICard {
        let c = card_constructor(this.getSeqNumber(), owner, this);
        this.getMyMaster(owner).addToDeck(c);
        return c;
    }
    genCardToHand(owner: Player,
        card_constructor: (seq: number, owner: Player, gm: GameMaster) => ICard
    ): ICard {
        let c = card_constructor(this.getSeqNumber(), owner, this);
        // TODO:
        return c;
    }
    genCharToBoard(owner: Player,
        char_constructor: (seq: number, owner: Player, gm: GameMaster) => ICharacter
    ): ICharacter {
        let c = char_constructor(this.getSeqNumber(), owner, this);
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
    GameMaster, BadOperationError
}