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
    public readonly card_play_chain = new HookChain<void>();
    public readonly card_die_chain = new HookChain<void>();

    public series: CardSeries[] = []

    constructor(public readonly seq: number, public readonly owner: Player,
        private readonly g_master: IGameMaster) { }

    onDraw() {}

    appendChainWhileAlive<T>(chain: HookChain<T>, func: (arg: T) => HookResult<T>|void) {
        let hook = chain.append(func, -1);
        this.card_die_chain.append(() => {
            hook.active_count = 0;
            return { did_trigger: true };
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
}

export { Card, Upgrade, Character };