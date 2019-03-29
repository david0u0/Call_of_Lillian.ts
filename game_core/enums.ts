export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event };
export enum CardSeries { Testing, Cyber, War, Cosmic, Wasteland }
export enum CharStat { StandBy, InArena, InBattle, Attacking, Blocking, Attacked };

/** 只有 Sniper, Attacker, Defender 是會寫在卡牌上的關鍵字 */
export type BattleRole = {
    can_attack: boolean,
    can_block: boolean,
    can_not_be_attacked?: boolean,
    // 即狙擊
    can_be_blocked?: boolean,
    // 機動角色在格擋或攻擊時可以暫時視為移動至相鄰場所
    fast_speed?: boolean,
    // 近戰角色在攻擊時，必需先移動至和攻擊對象同一個場所。
    // 在格擋時，則必需和保護對象或攻擊者處於同一個場所。
    // 近戰角色與其它場所的角色戰鬥時，不論戰力如何皆不會擊退對方。
    is_longrange?: boolean
    // NOTE: 先別設計遠程機動角色好了
};

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