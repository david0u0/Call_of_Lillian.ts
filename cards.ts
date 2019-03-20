import { CardType, CardSeries, Player, BattleRole, CharStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell } from "./interface";
import { GameMaster } from "./game_master";
import { EventChain, HookResult } from "./hook";

class CallbackCycleError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

abstract class Card implements ICard {
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly basic_mana_cost: number;

    public readonly get_mana_cost_chain = new EventChain<number>();
    public readonly card_play_chain = new EventChain<null>();
    public readonly card_leave_chain = new EventChain<null>();
    public readonly card_retire_chain = new EventChain<null>();

    public series: CardSeries[] = []

    public initialize() { }

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: GameMaster) { }

    appendChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.appendChainWhileAlive(c, func);
            }
        } else {
            let hook = chain.append(func, -1);
            this.card_leave_chain.append(() => {
                hook.active_count = 0;
            });
        }
    }
    /**
     * 創造一個新的規則，接上某條規則鏈的開頭。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    dominantChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.appendChainWhileAlive(c, func);
            }
        } else {
            let hook = chain.dominant(func, -1);
            this.card_leave_chain.append(() => {
                hook.active_count = 0;
            });
        }
    }
}

abstract class Upgrade extends Card implements IUpgrade {
    public readonly card_type = CardType.Upgrade;
    public abstract readonly basic_strength: number;
    public character_equipped: ICharacter | null = null;
}

abstract class Character extends Card implements ICharacter {
    public readonly card_type = CardType.Character;
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role = BattleRole.Fighter;

    public readonly upgrade_list: IUpgrade[] = [];
    public arena_entered: IArena | null = null;
    public status = CharStat.Waiting;

    public readonly get_strength_chain = new EventChain<number>();
    public readonly enter_arena_chain = new EventChain<IArena>();
}

export { Card, Upgrade, Character };