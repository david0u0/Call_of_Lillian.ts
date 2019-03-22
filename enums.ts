export enum Player { Player1, Player2 };
export enum CardStat { Retired, Hand, Deck, Onboard, Exile };
export enum CardType { Character, Arena, Upgrade, Spell, Event };
export enum CardSeries { Testing, Cyber, War, Cosmic, Wasteland }
export enum CharStat { StandBy, InArena, InBattle, Attacking, Blocking, Attacked };

/** 只有 Sniper, Attacker, Defender 是會寫在卡牌上的關鍵字 */
export enum BattleRole { Civilian, Defender, Fighter, Attacker, Sniper, Ghoast };