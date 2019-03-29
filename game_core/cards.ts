import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell, TypeGaurd, IEvent } from "./interface";
import { GameMaster, PlayerMaster } from "./game_master";
import { EventChain, HookResult, HookFunc, Hook } from "./hook";
import Selecter from "./selecter";
import { BadOperationError } from "./errors";
import { Constant as C } from "./general_rules"

abstract class Card implements ICard {
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly basic_mana_cost: number;
    public series: CardSeries[] = []

    public card_status = CardStat.Deck;

    public readonly get_mana_cost_chain = new EventChain<number, null>();
    public readonly card_play_chain = new EventChain<null, null>();
    public readonly card_leave_chain = new EventChain<null, null>();
    public readonly card_retire_chain = new EventChain<null, null>();

    protected readonly my_master: PlayerMaster;
    protected readonly enemy_master: PlayerMaster;

    public initialize() { return true; }
    public onPlay() { }
    public onRetrieve() { }

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: GameMaster
    ) {
        this.my_master = g_master.getMyMaster(owner);
        this.enemy_master = g_master.getEnemyMaster(owner);
    }

    public isEqual(card: ICard|null) {
        if(card) {
            return this.seq == card.seq;
        } else {
            return false;
        }
    }
    public rememberFields() { }
    public recoverFields() { }


    appendChainWhileAlive<T, U>(
        chain: EventChain<T, U>[]|EventChain<T, U>, func: HookFunc<T, U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.appendChainWhileAlive(c, func);
            }
        } else {
            let hook = chain.append(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
    dominantChainWhileAlive<T, U>(
        chain: EventChain<T, U>[]|EventChain<T, U>, func: HookFunc<T, U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.dominantChainWhileAlive(c, func);
            }
        } else {
            let hook = chain.dominant(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
    appendCheckWhileAlive<T, U>(
        chain: EventChain<T, U>[]|EventChain<T, U>, func: HookFunc<boolean, U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.appendCheckWhileAlive(c, func);
            }
        } else {
            let hook = chain.appendCheck(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
    dominantCheckWhileAlive<T, U>(
        chain: EventChain<T, U>[]|EventChain<T, U>, func: HookFunc<boolean, U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.dominantCheckWhileAlive(c, func);
            }
        } else {
            let hook = chain.dominantCheck(func);
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
    private mem_character_equipped: ICharacter | null = this.character_equipped;

    public initialize() {
        let char = this.g_master.selecter.selectSingleCard(TypeGaurd.isCharacter, char => {
            this.character_equipped = char;
            let can_play = this.my_master.checkCanPlay(this);
            return can_play;
        });
        if(char) {
            this.character_equipped = char;
            return true;
        } else {
            return false;
        }
    }

    rememberFields() {
        this.mem_character_equipped = this.character_equipped;
    }
    recoverFields() {
        this.character_equipped = this.mem_character_equipped;
    }
}

abstract class Character extends Card implements ICharacter {
    public readonly card_type = CardType.Character;
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = { can_attack: true, can_block: true };

    private _upgrade_list: IUpgrade[] = [];
    public get upgrade_list() { return [...this._upgrade_list] };
    public arena_entered: IArena | null = null;
    public char_status = CharStat.StandBy;
    public is_tired = false;
    public way_worn = false;
    public readonly assault = true;

    public has_char_action = false;
    public charAction() { }

    public readonly get_strength_chain = new EventChain<number, null>();
    public readonly get_inconflict_strength_chain
        = new EventChain<number, ICharacter>();
    public readonly get_battle_role_chain = new EventChain<BattleRole, null>();
    public readonly enter_arena_chain = new EventChain<null, IArena>();
    public readonly attack_chain = new EventChain<null, ICharacter>();

    public readonly exploit_chain = new EventChain<null, IArena>();
    public readonly enter_chain = new EventChain<null, IArena>();
    public readonly get_exploit_cost_chain = new EventChain<number, IArena>();
    public readonly get_enter_cost_chain = new EventChain<number, IArena>();
    // TODO: 加入某種角色內部的升級鏈（因為裝備升級未必是出牌）

    public readonly get_push_cost_chain = new EventChain<number, IEvent>();
    public readonly push_chain = new EventChain<null, IEvent>();
    public readonly finish_chain = new EventChain<null, IEvent>();

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
    private _position = -1;
    public get position() { return this._position; };
    public readonly abstract basic_exploit_cost: number;

    private _char_list = new Array<ICharacter>();
    public get char_list() { return [...this._char_list] };
    public readonly max_capacity = C.ARENA_CAPACITY;

    public readonly exploit_chain = new EventChain<null, ICharacter|Player>();
    public readonly enter_chain = new EventChain<null, ICharacter>();
    public readonly get_exploit_cost_chain = new EventChain<number, ICharacter|Player>();
    public readonly get_enter_cost_chain = new EventChain<number, ICharacter>();

    enter(char: ICharacter) {
        this._char_list.push(char);
    }
    abstract onExploit(char: ICharacter|Player): number|void;

    public initialize() {
        return true;
        /*let char = this.g_master.selecter.selectChars(1, 1, pos => {
        });
        this._character_equipped = char[0];*/
    }
}

abstract class Event extends Card implements IEvent {
    public readonly card_type = CardType.Event;
    public abstract readonly is_ending: boolean;
    public abstract readonly score: number;
    public abstract readonly goal_progress_count: number;
    public abstract readonly init_time_count: number;
    private _cur_progress_count = 0;
    public get cur_progress_count() { return this._cur_progress_count; };
    private _time_count_upward = 0;
    public get cur_time_count() { return this.init_time_count - this._time_count_upward; }
    public readonly push_cost = C.PUSH_COST;

    public readonly push_chain = (() => {
        // NOTE: 因為幾乎每個事件都需要檢查推進條件，這裡就統一把它放進鏈裡當軟性規則
        let chain = new EventChain<null, ICharacter|null>();
        chain.appendCheck((t, char) => {
            return { var_arg: this.checkCanPush(char) };
        });
        return chain;
    })();
    
    public readonly get_push_cost_chain = new EventChain<number, ICharacter|null>();

    public abstract checkCanPush(char: ICharacter|null): boolean;
    public abstract onPush(char: ICharacter|null): void;
    public abstract onFinish(char: ICharacter|null): void;

    public onFail() { }

    public push() {
        this._cur_progress_count++;
    }
    public countDown() {
        if(this.cur_time_count > 0) {
            this._time_count_upward++;
        }
    }
    public setProgrss(progress: number) {
        this._cur_progress_count = progress;
    }
    public setTimeCount(time_count: number) {
        this._time_count_upward = this.init_time_count - time_count;
    }
}

export { Card, Upgrade, Character, Arena, Event };