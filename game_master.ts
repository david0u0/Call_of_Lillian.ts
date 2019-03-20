import { Player } from "./enums";
import { ICard, ICharacter, IUpgrade } from "./interface";
import { EventChain, HookResult } from "./hook";

class PlayerMaster {
    private _mana: number;
    private _emo: number;
    private _deck: ICard[];
    private _hand: ICard[];
    private _gravyard: ICard[];
    private _characters: ICard[];
    private _arenas: ICard[];
    private _events: ICard[];
    public get mana() { return this._mana };
    public get emo() { return this._emo };

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

    public get_mana_cost_chain
        = new EventChain<{ cost: number, card: ICard }>();
    public get_equip_mana_cost_chain
        = new EventChain<{ cost: number, char: ICharacter, upgrade: IUpgrade }>();

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
        let { result_arg, intercept_effect } = this.set_mana_chain.trigger(new_mana);
        if(!intercept_effect) {
            this._mana -= result_arg;
        }
    }

    private _playCard(card: ICard) {
        let { intercept_effect } = this.card_play_chain.trigger(card);
        if(!intercept_effect) {
            ({ intercept_effect } = card.card_play_chain.trigger(null));
        }
        return intercept_effect;
    }

    playCharacter(char: ICharacter) {
        this._playCard(char);
        this._characters.push(char);
    }

    equip(upgrade: IUpgrade, char: ICharacter) {
        this._playCard(upgrade);
        upgrade.appendChainWhileAlive(char.get_strength_chain, strength => {
            return { result_arg: strength + upgrade.basic_strength };
        });
        char.upgrade_list.push(upgrade);
        upgrade.character_equipped = char;
    }
}

class GameMaster {
    private _cur_seq = 1;
    getSeqNumber(): number {
        return this._cur_seq++;
    }
    genCard(card_constructor: (seq: number, gm: GameMaster) => ICard): ICard {
        return card_constructor(this.getSeqNumber(), this);
    }

    private p_master1: PlayerMaster = new PlayerMaster(Player.Player1);
    private p_master2: PlayerMaster = new PlayerMaster(Player.Player2);
    getMyMaster(me: Player) {
        if(me == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(me: Player) {
        if(me == Player.Player1) {
            return this.p_master2;
        } else {
            return this.p_master1;
        }
    }

    public readonly battle_start_chain: EventChain<number> = new EventChain<number>();
    public readonly battle_end_chain: EventChain<number> = new EventChain<number>();
}

export {
    GameMaster
}