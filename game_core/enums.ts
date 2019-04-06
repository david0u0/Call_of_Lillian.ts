export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Finished, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event, Unknown };
export enum CardSeries { Testing, Cyber, War, Cosmic, Wasteland, Time, Hospital }
export enum CharStat { StandBy, InArena, InBattle, Attacking, Blocking, Attacked };

/** 只有 Sniper, Attacker, Defender 是會寫在卡牌上的關鍵字 */
export type BattleRole = {
    can_attack: boolean,
    can_block: boolean,
    can_not_be_attacked?: boolean,
    // 即狙擊
    can_be_blocked?: boolean,
    // 近程角色不可以攻擊鄰近場所的目標。
    // 在格擋時，則必需和保護對象或攻擊者處於同一個場所。
    is_melee?: boolean
};

export enum GamePhase {
    Setup,
    Building,

    InAction,
    BetweenActions,

    PreBattle,
    // InBattle 這個階段完全涵蓋於 post conflict 及 pre conflic
    PostBattle,

    PreConflict,
    PostConflict, // 衝突是一個瞬間的結算戰力的動作，故沒有 Conflict 這個階段

    PreExploit,
    Exploit,
    PostExploit,

    EndGame
};