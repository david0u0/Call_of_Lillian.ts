import { CardType, CardSeries, Player, BattleRole, CharStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell, IGameMaster } from "./interface";
import { HookChain, HookResult } from "./hook";

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

    public readonly get_mana_cost_chain = new HookChain<number>();
    public readonly card_play_chain = new HookChain<null>();
    public readonly card_die_chain = new HookChain<null>();

    public series: CardSeries[] = []

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: IGameMaster) { }

    /**
     * 在抽起來的同時觸發本效果
     */
    initialize() { }

    /**
     * 創造一個新的規則，接上某條規則鏈的尾巴。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    appendChainWhileAlive<T>(chain: HookChain<T>, func: (arg: T) => HookResult<T>|void) {
        let hook = chain.append(func, -1);
        this.card_die_chain.append(() => {
            hook.active_count = 0;
        });
    }
    /**
     * 創造一個新的規則，接上某條規則鏈的開頭。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    dominantChainWhileAlive<T>(chain: HookChain<T>, func: (arg: T) => HookResult<T>|void) {
        let hook = chain.dominant(func, -1);
        this.card_die_chain.append(() => {
            hook.active_count = 0;
        });
    }
}

abstract class Upgrade extends Card implements IUpgrade {
    public readonly card_type = CardType.Upgrade;
    public abstract readonly basic_strength: number;
    public character_equipped: ICharacter|null = null;
}

abstract class Character extends Card implements ICharacter {
    public readonly card_type = CardType.Character;
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role = BattleRole.Fighter;

    public readonly upgrade_list: IUpgrade[] = [];
    public arena_entered: IArena|null = null;
    public status = CharStat.Waiting;

    public readonly get_strength_chain = new HookChain<number>();
    public readonly enter_arena_chain = new HookChain<IArena>();
}

export { Card, Upgrade, Character };