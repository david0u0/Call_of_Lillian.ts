// TODO: 為了達成斷線復原的功能，應該把入場曲跟在場效果分清楚（多一個 setAliveChain 方法）

import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat, GamePhase } from "./enums";
import { IKnownCard, ICharacter, IUpgrade, IArena, ISpell, TypeGaurd, IEvent, ICard, Ability } from "./interface";
import { ActionChain, GetterChain, ActionFunc, GetterFunc  } from "./hook";
import { Constant as C } from "./general_rules";
import { BadOperationError } from "./errors";
import { PlayerMaster } from "./master/player_master";
import { GameMaster } from "./master/game_master";

abstract class KnownCard implements IKnownCard {
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly basic_mana_cost: number;
    public abstract can_play_phase: GamePhase[];
    public series: CardSeries[] = []
    public instance = false;

    public card_status = CardStat.Deck;

    public readonly check_before_play_chain = new GetterChain<boolean, null>();
    public readonly get_mana_cost_chain = new GetterChain<number, null>();
    public readonly card_play_chain = new ActionChain<null>();
    public readonly card_leave_chain = new ActionChain<null>();
    public readonly card_retire_chain = new ActionChain<null>();

    public readonly my_master: PlayerMaster;
    public readonly enemy_master: PlayerMaster;

    protected _abilities = new Array<Ability>();
    public get abilities() {
        let a = [...this._abilities];
        if(TypeGaurd.isCharacter(this)) {
            for(let upgrade of this.upgrade_list) {
                a = [...a, ...upgrade.abilities];
            }
        }
        return a;
    }

    public async initialize() { return true; }
    public onPlay() { }
    public setupAliveeEffect() { }
    public onRetrieve() { }

    constructor(public readonly seq: number, public readonly owner: Player,
        public readonly g_master: GameMaster
    ) {
        this.my_master = g_master.getMyMaster(owner);
        this.enemy_master = g_master.getEnemyMaster(owner);
    }

    public isEqual(card: IKnownCard|null) {
        if(card) {
            return this.seq == card.seq;
        } else {
            return false;
        }
    }
    public rememberFields() { }
    public recoverFields() { }

    addGetterWhileAlive<T, U>(append: boolean,
        chain: GetterChain<T, U>[]|GetterChain<T, U>, func: GetterFunc<T, U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addGetterWhileAlive(append, c, func);
            }
        } else {
            let hook = (() => {
                if(append) {
                    return chain.append(func, () => (this.card_status == CardStat.Onboard));
                } else {
                    return chain.dominant(func, () => (this.card_status == CardStat.Onboard));
                }
            })();
        }
    }
    addCheckWhileAlive<U>(append: boolean,
        chain: ActionChain<U>[]|ActionChain<U>, func: GetterFunc<boolean, U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addCheckWhileAlive(append, c, func);
            }
        } else {
            let hook = (() => {
                if(append) {
                    return chain.appendCheck(func, () => (this.card_status == CardStat.Onboard));
                } else {
                    return chain.dominantCheck(func, () => (this.card_status == CardStat.Onboard));
                }
            })();
        }
    }
    addActionWhileAlive<U>(append: boolean,
        chain: ActionChain<U>[]|ActionChain<U>, func: ActionFunc<U>
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addActionWhileAlive(append, c, func);
            }
        } else {
            let hook = (() => {
                if(append) {
                    return chain.append(func, () => (this.card_status == CardStat.Onboard));
                } else {
                    return chain.dominant(func, () => (this.card_status == CardStat.Onboard));
                }
            })();
        }
    }
}

abstract class Upgrade extends KnownCard implements IUpgrade {
    public card_type = CardType.Upgrade;
    public can_play_phase = [GamePhase.InAction];
    public abstract readonly basic_strength: number;
    public character_equipped: ICharacter | null = null;
    public readonly instance = true; // 升級卡不會暫用時間

    private mem_character_equipped: ICharacter | null = this.character_equipped;

    public async initialize() {
        let char = await this.g_master.selecter.selectCard(this.owner, this, TypeGaurd.isCharacter, char => {
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

abstract class Character extends KnownCard implements ICharacter {
    public readonly card_type = CardType.Character;
    public can_play_phase = [GamePhase.InAction];
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = { can_attack: true, can_block: true };

    private _upgrade_list: IUpgrade[] = [];
    public get upgrade_list() { return [...this._upgrade_list]; };
    public arena_entered: IArena | null = null;
    public char_status = CharStat.StandBy;
    public is_tired = false;
    public way_worn = false;
    public assault = false;

    public has_char_action = false;
    public charAction() { }

    public readonly change_char_tired_chain = new ActionChain<boolean>();
    public readonly get_strength_chain = new GetterChain<number, ICharacter|undefined>();
    public readonly get_battle_role_chain = new GetterChain<BattleRole, null>();
    public readonly enter_arena_chain = new ActionChain<IArena>();
    public readonly attack_chain = new ActionChain<ICharacter>();

    public readonly exploit_chain = new ActionChain<IArena>();
    public readonly enter_chain = new ActionChain<IArena>();
    public readonly get_exploit_cost_chain = new GetterChain<number, IArena>();
    public readonly get_enter_cost_chain = new GetterChain<number, IArena>();
    // TODO: 加入某種角色內部的升級鏈（因為裝備升級未必是出牌）

    public readonly get_push_cost_chain = new GetterChain<number, IEvent>();
    public readonly push_chain = new ActionChain<IEvent>();
    public readonly finish_chain = new ActionChain<IEvent>();

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

abstract class Arena extends KnownCard implements IArena {
    public readonly card_type = CardType.Arena;
    public can_play_phase = [GamePhase.Building];
    public position = -1;
    public readonly abstract basic_exploit_cost: number;

    public readonly max_capacity = C.ARENA_CAPACITY;
    private _char_list = new Array<ICharacter|null>(this.max_capacity).fill(null);
    public get char_list() { return [...this._char_list]; };

    public readonly exploit_chain = new ActionChain<ICharacter|Player>();
    public readonly enter_chain = new ActionChain<ICharacter>();
    public readonly get_exploit_cost_chain = new GetterChain<number, ICharacter|Player>();
    public readonly get_enter_cost_chain = new GetterChain<number, ICharacter>();

    enter(char: ICharacter) {
        let i = this.find(null);
        if(i != -1) {
            this._char_list[i] = char;
        } else {
            throw new BadOperationError("找不到空位", this);
        }
    }
    exit(char: ICharacter) {
        let i = this.find(char);
        if(i != -1) {
            this._char_list[i] = null;
        } else {
            throw new BadOperationError("找不到欲使之離開的角色", this);
        }
    }
    find(tar: ICharacter|null) {
        for(let i = 0; i < this.max_capacity; i++) {
            if(TypeGaurd.isCard(tar)) {
                if(tar.isEqual(this._char_list[i])) {
                    return i;
                }
            } else {
                if(!this.char_list[i]) {
                    return i;
                }
            }
        }
        return -1;
    }
    abstract onExploit(char: ICharacter|Player): void|number|Promise<void|number>;

    public async initialize() {
        let old_arena = await this.g_master.selecter.selectCard(this.owner, this, TypeGaurd.isArena, arena => {
            if(arena.card_status != CardStat.Onboard || arena.owner != this.owner) {
                return false;
            }
            else {
                this.position = arena.position;
                return this.my_master.checkCanPlay(this);
            }
        });
        if(old_arena) {
            return true;
        } else {
            return false;
        }
    }
    recoverFields() {
        this.position = -1;
    }
}

abstract class Event extends KnownCard implements IEvent {
    public readonly card_type = CardType.Event;
    public can_play_phase = [GamePhase.InAction];
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
        let chain = new ActionChain<ICharacter|null>();
        chain.appendCheck((t, char) => {
            return { var_arg: this.checkCanPush(char) };
        });
        return chain;
    })();
    
    public readonly get_push_cost_chain = new GetterChain<number, ICharacter|null>();
    public readonly fail_chain = new ActionChain<null>();
    public readonly finish_chain = new ActionChain<ICharacter|null>();

    public abstract checkCanPush(char: ICharacter|null): boolean;
    public abstract onPush(char: ICharacter|null): Promise<void>|void;
    public abstract onFinish(char: ICharacter|null): Promise<void>|void;
    public onFail() { }
    public abstract setupFinishEffect(char: ICharacter|null): Promise<void>|void;


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

export { KnownCard, Upgrade, Character, Arena, Event };