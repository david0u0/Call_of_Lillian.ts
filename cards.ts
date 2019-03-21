import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell } from "./interface";
import { GameMaster, BadOperationError } from "./game_master";
import { EventChain, HookResult } from "./hook";

abstract class Card implements ICard {
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly basic_mana_cost: number;
    public series: CardSeries[] = []

    public card_status = CardStat.Deck;

    public readonly get_mana_cost_chain = new EventChain<number>();
    public readonly card_play_chain = new EventChain<null>();
    public readonly card_leave_chain = new EventChain<null>();
    public readonly card_retire_chain = new EventChain<null>();

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: GameMaster) { }

    public isEqual(card: ICard) {
        return this.seq == card.seq;
    }
    public initialize() { }
    public setupBeforePlay() { }

    appendChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void, check?: boolean
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.appendChainWhileAlive(c, func, check);
            }
        } else {
            let hook = check ? chain.appendCheck(func) : chain.append(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
    dominantChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void, check?: boolean
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.dominantChainWhileAlive(c, func, check);
            }
        } else {
            let hook = check ? chain.dominantCheck(func) : chain.dominant(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
}

abstract class Upgrade extends Card implements IUpgrade {
    public readonly card_type = CardType.Upgrade;
    public abstract readonly basic_strength: number;
    public character_equipped: ICharacter | null = null;

    constructor(seq: number, owner: Player, g_master: GameMaster) {
        super(seq, owner, g_master);
        this.card_play_chain.append(() => {
            if(this.character_equipped) {
                if(this.character_equipped.card_status != CardStat.Onboard) {
                    throw new BadOperationError("指定的角色不在場上");
                }
                if(this.character_equipped.char_status != CharStat.StandBy) {
                    throw new BadOperationError("指定的角色不在待命區");
                } else {
                    this.character_equipped.upgrade_list.push(this);
                    this.appendChainWhileAlive(
                        this.character_equipped.get_strength_chain, str => {
                            return { result_arg: str + this.basic_strength };
                        }
                    );
                }
            } else {
                throw new BadOperationError("未指定角色就打出升級");
            }
        });
    }
}

abstract class Character extends Card implements ICharacter {
    public readonly card_type = CardType.Character;
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = BattleRole.Fighter;

    public readonly upgrade_list: IUpgrade[] = [];
    public arena_entered: IArena | null = null;
    public char_status = CharStat.StandBy;
    public is_tired = false;

    public readonly get_strength_chain = new EventChain<number>();
    public readonly get_battle_role_chain = new EventChain<BattleRole>();
    public readonly enter_arena_chain = new EventChain<IArena>();
    public readonly attack_chain = new EventChain<ICharacter>();

    constructor(seq: number, owner: Player, g_master: GameMaster) {
        super(seq, owner, g_master);
        this.get_battle_role_chain.append(role => {
            if(g_master.getMyMaster(this).getStrength(this) == 0) {
                role = BattleRole.Civilian;
            }
            return { result_arg: role };
        });
        this.card_play_chain.append(() => {
            this.g_master.getMyMaster(this).addCharacter(this);
        });
    }
}

export { Card, Upgrade, Character };