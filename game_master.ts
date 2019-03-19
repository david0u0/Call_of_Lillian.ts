import {
    Player, CardStat, CardType, CardSeries,
    BattleRole, CharStat,
    IKeeper, ICard, ICharacter, IUpgrade, IArena, ISpell, IGameMaster
} from "./interface";
import { Card } from "./cards";
import { HookChain, HookResult } from "./hook";

class PlayerStatus {
    public readonly mana: number;
    public readonly emo: number;
    public readonly deck: ICard[];
    public readonly hand: ICard[];
    public readonly gravyard: ICard[];
    public readonly characters: ICard[];
    public readonly arenas: ICard[];
    public readonly events: ICard[];

    public readonly card_play_chain: HookChain<Card> = new HookChain();
    public readonly card_die_chain: HookChain<Card> = new HookChain();
    
    public readonly add_mana_chain: HookChain<number> = new HookChain();
    public readonly spend_mana_chain: HookChain<number> = new HookChain();

    public readonly add_emo_chain: HookChain<number> = new HookChain();
    public readonly cure_mana_chain: HookChain<number> = new HookChain();

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
    public appendWhenCardAlive<T>(chain: HookChain<T>, func: (arg: T) => HookResult<T>|void, card_seq: number) {
        let hook = chain.append(func, 1);
        this.card_die_chain.append((card) => {
            if(card.seq != card_seq) {
                return { did_trigger: false };
            } else {
                hook.active_count = 0;
                return { did_trigger: true };
            }
        });
    }
}

class GameMaster implements IGameMaster {
    private cur_seq = 1;
    getSeqNumber(): number {
        return this.cur_seq++;
    }

    private p_status1: PlayerStatus = new PlayerStatus(Player.Player1);
    private p_status2: PlayerStatus = new PlayerStatus(Player.Player2);

    getMyStatus(me: Player) {
        if(me == Player.Player1) {
            return this.p_status1;
        } else {
            return this.p_status2;
        }
    }
    getEnemyStatus(me: Player) {
        if(me == Player.Player1) {
            return this.p_status2;
        } else {
            return this.p_status1;
        }
    }
    
    public readonly battle_start_chain: HookChain<number> = new HookChain<number>();
    public readonly battle_end_chain: HookChain<number> = new HookChain<number>();
}