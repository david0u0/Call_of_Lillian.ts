export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event };
export enum CardSeries { Testing, Cyber, War, Cosmic, Wasteland }
export enum CharStat { StandBy, InArena, InBattle, Attacking, Blocking, Attacked };

/** 只有 Sniper, Attacker, Defender 是會寫在卡牌上的關鍵字 */
export enum BattleRole { Civilian, Defender, Attacker, Fighter, Sniper, Sniper_Attacker };

export enum GamePhase {
    Setup,
    Building,

    InAction,
    BetweenActions,
    BetweenRounds,

    PreBattle,
    // InBattle 這個階段完全涵蓋於 post conflict 及 pre conflic
    PostBattle,

    PreConflict,
    PostConflict, // 衝突是一個瞬間的結算戰力的動作，故沒有 Conflict 這個階段

    PreLiquidatioin,
    Liqudatioin,
    PostLiquidation,

    EndGame
}