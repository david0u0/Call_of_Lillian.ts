export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event, Unknown };
export enum CardSeries { Testing, Cyber, Arms, Cosmic, Wasteland, Time, Hospital, Entertainment };
export enum CharStat { StandBy, InArena, InWar };

const SeriesTxt = {
    [CardSeries.Cosmic]: "宇宙",
    [CardSeries.Arms]: "軍火",
    [CardSeries.Cyber]: "賽博",
    [CardSeries.Hospital]: "醫院",
    [CardSeries.Entertainment]: "娛樂",
};

export { SeriesTxt };

/** 只有 Sniper, Attacker, Defender 是會寫在卡牌上的關鍵字 */
export type BattleRole = {
    can_attack: boolean,
    can_block: boolean,
    can_not_be_target?: boolean,
    // 即狙擊
    can_not_be_blocked?: boolean,
    // 近程角色不可以攻擊鄰近場所的目標。
    // 在格擋時，則必需和保護對象或攻擊者處於同一個場所。
    is_melee?: boolean
};

export enum GamePhase {
    Setup,
    Building,

    InAction,
    BetweenActions,

    InWar,
    EndWar, // 可以在這時執行某些特殊的瞬間行動

    Exploit,

    EndGame,

    Any
};

export enum RuleEnums {
    All,
    
    ExitAfterExploit,
    RecoverEmoAfterRelease,
    CustomPushCheck,
    PunishOnFail,
    EndGameAfterFinish,

    CheckPhaseBeforePlay,
    CheckPriceBeforePlay,

    CheckStandbyWhenPlay,
    
    Possessed,
    Beyond,
    
}