import { HookChain } from "./hook";
import { Player, CardType, CardSeries, BattleRole, CharStat } from "./enums";

interface IPlayerMaster {
    mana: number;
    emo: number;
    setMana(new_mana: number): void;
    setEmo(new_emo: number): void;
    set_mana_chain: HookChain<number>;
    set_emo_chain: HookChain<number>;
    card_play_chain: HookChain<ICard>;
    card_die_chain: HookChain<ICard>; 
}
interface IGameMaster { 
    getMyMaster(p: Player): IPlayerMaster;
    getEnemyMaster(p: Player): IPlayerMaster;
}

interface IKeeper { };
interface ICard {
    readonly seq: number;
    readonly owner: Player;
    readonly card_type: CardType;
    readonly name: string;
    readonly description: string;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];
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
    IPlayerMaster, IGameMaster, IKeeper, ICard, ICharacter, IUpgrade, IArena, ISpell
}