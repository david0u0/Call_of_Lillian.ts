export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event, Unknown };
export enum CardSeries { Testing, Cyber, War, Cosmic, Wasteland, Time, Hospital, Entertainment };
export enum CharStat { StandBy, InArena, InWar };

/** 只有 Sniper, Attacker, Defender 是會寫在卡牌上的關鍵字 */
export type BattleRole = {
    can_attack: boolean,
    can_block: boolean,
    can_not_be_attacked?: boolean,
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

    EndGame
};

export enum RuleEnums {
    ExitAfterExploit,
    RecoverEmoAfterRelease,
    CustomPushCheck,
    PunishOnFail,
    EndGameAfterFinish,
    
    Possessed,
    Beyond,
    
}