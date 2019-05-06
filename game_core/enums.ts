export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event, Unknown };
export enum CharStat { StandBy, InArena, InWar };

/** NOTE: 千萬不要直接拿兩個事件做比較！！請使用 checkBelongToSeries 方法（否則會忘記 Any）。 */
export enum CardSeries {
    Any,
    Testing, Cyber, Arms, Cosmic, Wasteland, Time,
    Hospital, Entertainment, School,
};
const SeriesTxt = {
    [CardSeries.Cosmic]: "宇宙",
    [CardSeries.Arms]: "軍火",
    [CardSeries.Cyber]: "賽博",
    [CardSeries.Hospital]: "醫院",
    [CardSeries.Entertainment]: "娛樂",
    [CardSeries.School]: "學校",
};

/**
 * 例如：要確認一張牌是不是醫院：checkBelongToSeries(Hospital, card.series)
 * @param 
 * @param target 
 */
export function checkBelongToSeries(goal: CardSeries, target: CardSeries[]) {
    if(target.indexOf(CardSeries.Any) != -1) {
        return true;
    } else {
        return (target.indexOf(goal) != -1);
    }
}

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

export enum ActionEnums {
    PlayCard,
    Enter,
    Push,
    Exploit,
    Ability,
    Incite,
    Declare,
}

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
    Any,
    Possessed,
    Beyond,
    
    ExitAfterExploit,
    RecoverEmoAfterRelease,
    CustomPushCheck,
    PunishOnFail,
    EndGameAfterFinish,

    CheckPhaseBeforePlay,
    CheckQuotaBeforePlayChar,
    CheckPriceBeforePlay,

    CheckStandbyWhenPlayUpgrade,

    CheckTiredWhenEnter,
    CheckPhaseWhenEnter,

    CheckPhaseWhenExploit,

    CheckPhaseWhenPush,
    
}