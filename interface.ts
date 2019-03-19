enum Player { Player1, Player2 };
enum CardStat { Dead, Hand, Deck, Onboard, Exile };
enum CardType { Character, Arena, Upgrade, Spell, Event };
enum CardSeries { Cyber, War, Cosmic, Wasteland }

enum BattleRole { Civilian, Defender, Fighter };
enum CharStat { Tired, Waiting, InBattle, InArena };

interface IGameMaster { };
interface IKeeper { };
interface ICard {
    readonly seq: number;
    readonly owner: Player;
    readonly card_type: CardType;
    readonly name: string;
    readonly description: string;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];
    mana_cost_modifier: number;
    getManaCost(g_master: IGameMaster): number;
}
interface ICharacter extends ICard { };
interface IUpgrade extends ICard { };
interface ICharacter extends ICard { };
interface IArena extends ICard { };
interface IEvent extends ICard { };
interface ISpell extends ICard { };
/*interface PlayerStatus {
    readonly player: Player;
    readonly emo: number;
    readonly mana: number;
    readonly hand: ICard[];
    readonly deck: ICard[];
    readonly chars: ICharacter[];
    readonly arenas: IArena[];
    readonly events: IEvent[];
}*/

interface IUpgrade extends ICard {
    readonly basic_strength: number;
    character_equipped: ICharacter|null;
    onEquip(g_master: IGameMaster, char: ICharacter): void;
    
}
interface ICharacter extends ICard {
    readonly basic_strength: number;
    readonly basic_battle_role: BattleRole;
    upgrade_list: IUpgrade[];
    arena_entered: IArena|null;
    status: CharStat;
    getStrength(g_master: IGameMaster): number;
    getBattleRole(g_master: IGameMaster): BattleRole;
    //onEnter(arena: IArena): void;
    onEquip(g_master: IGameMaster, upgrade: IUpgrade): void;
}

interface IArena extends ICard {
    onEnter(g_master: IGameMaster, char: ICharacter): void;
    onExploit(g_master: IGameMaster, char: ICharacter): void;
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
    Player, CardStat, CardType, CardSeries,
    BattleRole, CharStat,
    IKeeper, ICard, ICharacter, IUpgrade, IArena, ISpell, IGameMaster
}