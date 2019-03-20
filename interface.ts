import { HookChain, HookResult } from "./hook";
import { Player, CardType, CardSeries, BattleRole, CharStat } from "./enums";

interface IKeeper { };
interface ICard {
    readonly seq: number;
    readonly owner: Player;
    readonly card_type: CardType;
    readonly name: string;
    readonly description: string;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];

    readonly get_mana_cost_chain: HookChain<number>;
    readonly card_play_chain: HookChain<null>;
    readonly card_die_chain: HookChain<null>;

    appendChainWhileAlive<T>(chain: HookChain<T>,
        func: (arg: T) => HookResult<T>|void): void ;
}
interface ICharacter extends ICard { };
interface IUpgrade extends ICard { };
interface ICharacter extends ICard { };
interface IArena extends ICard { };
interface IEvent extends ICard { };
interface ISpell extends ICard { };

interface IUpgrade extends ICard {
    readonly basic_strength: number;
    character_equipped: ICharacter|null;
    
}
interface ICharacter extends ICard {
    readonly basic_strength: number;
    readonly basic_battle_role: BattleRole;
    upgrade_list: IUpgrade[];
    arena_entered: IArena|null;
    status: CharStat;

    readonly get_strength_chain: HookChain<number>;
    readonly enter_arena_chain: HookChain<IArena>;
}

interface IArena extends ICard {
}
interface IEvent extends ICard {
    readonly goal_progress_count: number;
    readonly cur_progress_count: number;
    readonly init_time_count: number;
    readonly cur_time_count: number;
    readonly is_ending: boolean;
}
interface ISpell extends ICard {

}
export {
    IKeeper, ICard, ICharacter, IUpgrade, IArena, ISpell
}