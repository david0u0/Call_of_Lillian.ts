import {
    Player, CardStat, CardType, CardSeries,
    BattleRole, CharStat,
    IKeeper, ICard, ICharacter, IUpgrade, IArena, ISpell, IGameMaster
} from "./interface";

type HookResult<T> = {
    did_trigger?: boolean,
    break_chain?: boolean,
    result_arg?: T
};

type Hook<T> = {
    active_count: number, // 0代表無活性，-1代表永久
    func: (arg: T) => HookResult<T>|void
};

/** NOTE: 所有這些 hook 都是在動作開始前執行，所以是有可能修改動作本身的。 */
class HookChain<T> {
    private list: Hook<T>[] = [];
    public trigger(arg: T): T {
        for(let h of this.list) {
            if(h.active_count != 0) {
                let result = h.func(arg);
                if(result && result.did_trigger) {
                    if(h.active_count > 0) {
                        h.active_count--;
                    }
                    if(result.break_chain) {
                        break;
                    }
                    if(typeof result.result_arg != "undefined") {
                        arg = result.result_arg;
                    }
                }
            }
        }
        return arg;
    }
    public append(func: (arg: T) => HookResult<T>|void, active_count=-1): Hook<T> {
        let h = { active_count, func };
        this.list.push(h);
        return h;
    }
    public dominant(func: (arg: T) => HookResult<T>|void, active_count=-1): Hook<T> {
        let h = { active_count, func };
        this.list = [h, ...this.list];
        return h;
    }
}

class PlayerStatus {
    public readonly mana: number;
    public readonly emo: number;
    public readonly deck: ICard[];
    public readonly hand: ICard[];
    public readonly gravyard: ICard[];
    public readonly characters: ICard[];
    public readonly arenas: ICard[];
    public readonly events: ICard[];

    public readonly card_die_chain: HookChain<number> = new HookChain();
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
        this.card_die_chain.append((seq) => {
            if(seq != card_seq) {
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