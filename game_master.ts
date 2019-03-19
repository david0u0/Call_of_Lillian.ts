import { Player } from "./enums";
import { IGameMaster } from "./interface";
import { Card, Upgrade, Character } from "./cards";
import { HookChain, HookResult } from "./hook";

class PlayerMaster {
    public mana: number;
    public emo: number;
    public deck: Card[];
    public hand: Card[];
    public gravyard: Card[];
    public characters: Card[];
    public arenas: Card[];
    public events: Card[];

    constructor(public readonly player: Player) {
        this.mana = 0;
        this.emo = 0;
        this.deck = [];
        this.hand = [];
        this.gravyard = [];
        this.characters = [];
        this.arenas = [];
        this.events = [];
    }
    
    public readonly get_mana_cost_chain
        = new HookChain<{ cost: number, card: Card }>();

    public add_mana_chain: HookChain<number> = new HookChain();
    public spend_mana_chain: HookChain<number> = new HookChain();

    public add_emo_chain: HookChain<number> = new HookChain();
    public cure_mana_chain: HookChain<number> = new HookChain();

    public card_play_chain: HookChain<Card> = new HookChain();
    public card_die_chain: HookChain<Card> = new HookChain();
    
    getManaCost(card: Card) {
        let arg = { cost: card.basic_mana_cost, card };
        let { result_arg } = this.get_mana_cost_chain.trigger(arg);
        return card.get_mana_cost_chain.trigger(result_arg.cost).result_arg;
    }

    spendMana(p: Player, cost: number) {
        let { result_arg, intercept_effect } = this.spend_mana_chain.trigger(cost);
        if(!intercept_effect) {
            this.mana -= result_arg;
        }
    }

    playCharacter(char: Character) {
    }

    equip(upgrade: Upgrade, char: Character) {
        // char.upgrade_list.push(upgrade);
        // upgrade.character_equipped = char;
    }
}

class GameMaster implements IGameMaster {
    private cur_seq = 1;
    getSeqNumber(): number {
        return this.cur_seq++;
    }

    private p_master1: PlayerMaster = new PlayerMaster(Player.Player1);
    private p_master2: PlayerMaster = new PlayerMaster(Player.Player2);

    getMyStatus(me: Player) {
        if(me == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyStatus(me: Player) {
        if(me == Player.Player1) {
            return this.p_master2;
        } else {
            return this.p_master1;
        }
    }

    public readonly battle_start_chain: HookChain<number> = new HookChain<number>();
    public readonly battle_end_chain: HookChain<number> = new HookChain<number>();

}