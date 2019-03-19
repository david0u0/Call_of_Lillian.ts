import { Player } from "./enums";
import { IGameMaster, IPlayerMaster, ICard } from "./interface";
import { Card, Upgrade, Character } from "./cards";
import { HookChain, HookResult } from "./hook";

class PlayerMaster implements IPlayerMaster {
    private _mana: number;
    private _emo: number;
    private _deck: Card[];
    private _hand: Card[];
    private _gravyard: Card[];
    private _characters: Card[];
    private _arenas: Card[];
    private _events: Card[];
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
    
    public readonly get_mana_cost_chain
        = new HookChain<{ cost: number, card: Card }>();

    public set_mana_chain: HookChain<number> = new HookChain();
    public set_emo_chain: HookChain<number> = new HookChain();

    public card_play_chain: HookChain<ICard> = new HookChain();
    public card_die_chain: HookChain<ICard> = new HookChain();
    
    setEmo(new_emo: number) {
        let { result_arg, intercept_effect } = this.set_emo_chain.trigger(new_emo);
        if(!intercept_effect) {
            this._emo -= result_arg;
        }
    }

    getManaCost(card: Card) {
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

    private _playCard(card: Card) {
        let cost = this.getManaCost(card);
        if(cost > this.mana) {
            throw Error("??");
        }
        let { intercept_effect } = this.card_play_chain.trigger(card);
        if(!intercept_effect) {
            ({ intercept_effect } = card.card_play_chain.trigger(null));
        }
        if(!intercept_effect) {
            this.setMana(this.mana - cost);
        }
    }

    playCharacter(char: Character) {
        this._playCard(char);
        this._characters.push(char);
    }

    equip(upgrade: Upgrade, char: Character) {
        this._playCard(upgrade);
        upgrade.appendChainWhileAlive(char.get_strength_chain, strength => {
            return { result_arg: strength + upgrade.basic_strength };
        });
        char.upgrade_list.push(upgrade);
        upgrade.character_equipped = char;
    }
}

class GameMaster implements IGameMaster {
    private cur_seq = 1;
    getSeqNumber(): number {
        return this.cur_seq++;
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

    public readonly battle_start_chain: HookChain<number> = new HookChain<number>();
    public readonly battle_end_chain: HookChain<number> = new HookChain<number>();
}