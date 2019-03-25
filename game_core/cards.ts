import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell, TypeGaurd } from "./interface";
import { GameMaster } from "./game_master";
import { EventChain, HookResult } from "./hook";
import Selecter from "./selecter";
import { BadOperationError } from "./errors";

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

    public initialize() { }
    public onPlay() { }
    public onRetrieve() { }

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: GameMaster) { }

    public isEqual(card: ICard|null) {
        if(card) {
            return this.seq == card.seq;
        } else {
            return false;
        }
    }
    public rememberFields() { }
    public recoverFields() { }

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
    public card_type = CardType.Upgrade;
    public abstract readonly basic_strength: number;
    public character_equipped: ICharacter | null = null;

    initialize() {
        let char = this.g_master.selecter.selectCard(TypeGaurd.isCharacter, 1, 1, char => {
            this.character_equipped = char;
            let can_play = this.g_master.getMyMaster(this).checkCanPlay(this);
            this.character_equipped = null;
            return can_play;
        });
        this.character_equipped = char[0];
    }

    recoverFields() {
        this.character_equipped = null;
    }
}

abstract class Character extends Card implements ICharacter {
    public readonly card_type = CardType.Character;
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = BattleRole.Fighter;

    private _upgrade_list: IUpgrade[] = [];
    public get upgrade_list() { return [...this._upgrade_list] };
    public arena_entered: IArena | null = null;
    public char_status = CharStat.StandBy;
    public is_tired = false;
    public way_worn = false;

    public has_char_action = false;
    public charAction() { }

    public readonly get_strength_chain = new EventChain<number>();
    public readonly get_infight_strength_chain
        = new EventChain<{ strength: number, enemy: ICharacter }>();
    public readonly get_battle_role_chain = new EventChain<BattleRole>();
    public readonly enter_arena_chain = new EventChain<IArena>();
    public readonly attack_chain = new EventChain<ICharacter>();

    public readonly exploit_chain = new EventChain<IArena>();
    public readonly enter_chain = new EventChain<IArena>();
    public readonly get_exploit_cost_chain = new EventChain<{ cost: number, arena: IArena }>();
    public readonly get_enter_cost_chain = new EventChain<{ cost: number, arena: IArena }>();

    addUpgrade(u: IUpgrade) {
        this._upgrade_list.push(u);
    }
    distroyUpgrade(u: IUpgrade) {
        let i = 0;
        let list = this._upgrade_list;
        for(i = 0; i < list.length; i++) {
            if(list[i].isEqual(u)) {
                break;
            }
        }
        if(i != list.length) {
            this._upgrade_list = [...list.slice(0, i), ...list.slice(i+1)];
        }
    }

    private mem_arena_entered = this.arena_entered;
    rememberFields() {
        this.mem_arena_entered = this.arena_entered;
    }
    recoverFields() {
        this.arena_entered = this.mem_arena_entered;
    }
}

abstract class Arena extends Card implements IArena {
    public readonly card_type = CardType.Arena;
    private _positioin = -1;
    public get positioin() { return this._positioin; };
    public readonly abstract basic_exploit_cost: number;

    private _char_list = new Array<ICharacter>();
    public get char_list() { return [...this._char_list] };
    public readonly max_capacity = 2;

    public readonly exploit_chain = new EventChain<ICharacter>();
    public readonly enter_chain = new EventChain<ICharacter>();
    public readonly get_exploit_cost_chain = new EventChain<{ cost: number, char: ICharacter }>();
    public readonly get_enter_cost_chain = new EventChain<{ cost: number, char: ICharacter }>();

    enter(char: ICharacter) {
        if(this.char_list.length + 1 > this.max_capacity) {
            throw new BadOperationError("超過場所的人數上限！");
        }
        this._char_list.push(char);
    }
    abstract onExploit(char: ICharacter): number|void;

    initialize() {
        /*let char = this.g_master.selecter.selectChars(1, 1, pos => {
        });
        this._character_equipped = char[0];*/
    }
}

export { Card, Upgrade, Character, Arena };