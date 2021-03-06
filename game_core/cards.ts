import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat, GamePhase, RuleEnums } from "./enums";
import {
    IKnownCard, ICharacter, IUpgrade, IArena, ISpell, TypeGaurd as TG,
    IEvent, Ability, Data, Card, buildConfig
} from "./interface";
import { ActionChain, GetterChain, ActionFunc, GetterFunc, CheckFunc  } from "./hook";
import { Constant as C } from "./general_rules";
import { BadOperationError } from "./errors";
import { PlayerMaster } from "./master/player_master";
import { GameMaster } from "./master/game_master";

abstract class KnownCard extends Card implements IKnownCard {
    public readonly tested = false;
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public readonly deck_count = C.CARD_DECK_COUNT;
    public abstract readonly basic_mana_cost: number;
    public abstract can_play_phase: GamePhase[];
    public series: CardSeries[] = []
    public instance = false;

    public readonly data: Data = {};
    private readonly _mem_data: Data = {};

    public card_status = CardStat.Deck;

    public readonly check_before_play_chain = new GetterChain<boolean, null>();
    public readonly get_mana_cost_chain = new GetterChain<number, null>();
    public readonly card_play_chain = new ActionChain<null>();
    public readonly card_leave_chain = new ActionChain<CardStat>();
    public readonly card_retire_chain = new ActionChain<null>();

    public readonly my_master: PlayerMaster;
    public readonly enemy_master: PlayerMaster;

    protected _abilities = new Array<Ability>();
    public get abilities() {
        let res = [...this._abilities];
        if(TG.isCharacter(this)) {
            for(let upgrade of this.upgrade_list) {
                res = [...res, ...upgrade.abilities];
            }
        }
        return res.filter(a => a.can_play_phase.indexOf(this.g_master.t_master.cur_phase) != -1);
    }

    public initialize(): Promise<boolean> | boolean { return true; }
    public onPlay() { }
    public setupAliveEffect() { }
    public onRetrieve() { }

    constructor(seq: number, public readonly owner: Player,
        public readonly g_master: GameMaster, public readonly abs_name: string
    ) {
        super(seq, owner);
        this.my_master = g_master.getMyMaster(owner);
        this.enemy_master = g_master.getEnemyMaster(owner);
        this._mem_data = { ...this.data };
    }

    public rememberDatas() {
        for(let field in this.data) {
            let tar = this.data[field];
            if(tar instanceof Array) {
                this._mem_data[field] = [...tar];
            } else {
                this._mem_data[field] = tar;
            }
        }
    }
    public recoverDatas() {
        for(let field in this._mem_data) {
            let tar = this._mem_data[field];
            if(tar instanceof Array) {
                this.data[field] = [...tar];
            } else {
                this.data[field] = tar;
            }
        }
    }

    protected addGetterWhileAlive<T, U>(chain: GetterChain<T, U>[]|GetterChain<T, U>,
        func: GetterFunc<T, U>, append = true
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addGetterWhileAlive(c, func, append);
            }
        } else {
            if(append) {
                return chain.append(func, () => (this.card_status == CardStat.Onboard));
            } else {
                return chain.dominant(func, () => (this.card_status == CardStat.Onboard));
            }
        }
    }
    protected addCheckWhileAlive<U>(chain: ActionChain<U>[] | ActionChain<U>,
        func: CheckFunc<U>, append=true
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addCheckWhileAlive(c, func, append);
            }
        } else {
            if(append) {
                return chain.appendCheck(func, () => (this.card_status == CardStat.Onboard));
            } else {
                return chain.dominantCheck(func, () => (this.card_status == CardStat.Onboard));
            }
        }
    }
    protected addActionWhileAlive<U>(chain: ActionChain<U>[]|ActionChain<U>,
        func: ActionFunc<U>, append = true
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addActionWhileAlive(c, func, append);
            }
        } else {
            if(append) {
                return chain.append(func, () => (this.card_status == CardStat.Onboard));
            } else {
                return chain.dominant(func, () => (this.card_status == CardStat.Onboard));
            }
        }
    }

    /** 底下是一些輔助用的函式 */
    /** 超凡 */
    protected beyond(n: number) {
        let chain = new GetterChain<boolean, null>();
        chain.append(() => {
            if(this.my_master.getScore() < n) {
                return { var_arg: false };
            }
        }, undefined, RuleEnums.Beyond);
        return chain;
    }
    /** 入魔 */
    protected posessed(n: number, player=this.owner) {
        let chain = new GetterChain<boolean, null>();
        chain.append(() => {
            if(this.g_master.getMyMaster(player).emo < n) {
                return { var_arg: false };
            }
        }, undefined, RuleEnums.Possessed);
        return chain;
    }
}

abstract class Upgrade extends KnownCard implements IUpgrade {
    public readonly card_type = CardType.Upgrade;
    public can_play_phase = [GamePhase.InAction];
    public abstract readonly basic_strength: number;
    public readonly instance = true; // 升級卡不會暫用時間
    public readonly assault: boolean = false;

    public readonly data = {
        character_equipped: null as ICharacter | null
    };
    
    public readonly get_strength_chain = new GetterChain<number, ICharacter|undefined>();

    public async initialize() {
        let char = await this.g_master.selecter.promptUI("指定裝備者")
        .selectCard(this.owner, this, buildConfig({
            guard: TG.isCharacter,
            owner: this.owner,
        }));
        if(char) {
            this.data.character_equipped = char;
            return true;
        } else {
            return false;
        }
    }
}

abstract class Character extends KnownCard implements ICharacter {
    public readonly card_type = CardType.Character;
    public can_play_phase = [GamePhase.InAction];
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = { can_attack: true, can_block: true };

    private _upgrade_list: IUpgrade[] = [];
    public get upgrade_list() { return [...this._upgrade_list]; };
    public char_status = CharStat.StandBy;
    public is_tired = false;
    public get assault() {
        for(let u of this.upgrade_list) {
            if(u.assault) {
                return true;
            }
        }
        return this._assault;
    }
    protected _assault: boolean = false;

    public readonly change_char_tired_chain = new ActionChain<boolean>();
    public readonly get_strength_chain = new GetterChain<number, ICharacter|undefined>();
    public readonly get_battle_role_chain = new GetterChain<BattleRole, null>();
    public readonly enter_arena_chain = new ActionChain<IArena>();
    
    public readonly release_chain = new ActionChain<null>();
    public readonly incited_chain = new ActionChain<null>();
    public readonly repulse_chain = new ActionChain<ICharacter[]>();

    public readonly exploit_chain = new ActionChain<IArena>();
    public readonly enter_chain = new ActionChain<IArena>();
    public readonly get_exploit_cost_chain = new GetterChain<number, IArena>();
    public readonly get_enter_cost_chain = new GetterChain<number, IArena>();
    // TODO: 加入某種角色內部的升級鏈（因為裝備升級未必是出牌）

    public readonly get_push_cost_chain = new GetterChain<number, IEvent>();
    public readonly push_chain = new ActionChain<IEvent>();
    public readonly finish_chain = new ActionChain<IEvent>();

    public readonly data = {
        arena_entered: null as IArena | null,
        str_counter: 0
    };

    setUpgrade(u: IUpgrade) {
        this._upgrade_list.push(u);
    }
    unsetUpgrade(u: IUpgrade) {
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
}

abstract class Arena extends KnownCard implements IArena {
    public readonly card_type = CardType.Arena;
    public can_play_phase = [GamePhase.Building];
    public readonly abstract basic_exploit_cost: number;

    public readonly max_capacity = C.ARENA_CAPACITY;
    private _char_list = new Array<ICharacter|null>(this.max_capacity).fill(null);
    public get char_list() { return [...this._char_list]; };

    public readonly data = {
        position: -1
    };

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
            if(TG.isCard(tar)) {
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
    abstract onExploit(char: ICharacter|Player, nonce?: number): void|number|Promise<void|number>;

    public async initialize() {
        let old_arena = await this.g_master.selecter.promptUI("指定建築場所")
        .selectCard(this.owner, this, buildConfig({
            guard: TG.isArena,
            owner: this.owner,
            check: (arena) => {
                this.data.position = arena.data.position;
                return this.my_master.checkCanPlay(this);
            }
        }));
        if(old_arena) {
            this.data.position = old_arena.data.position;
            return true;
        } else {
            return false;
        }
    }
    protected getPlayerAndCaller(char: ICharacter | Player): [Player, IKnownCard[]] {
        let p = TG.isCard(char) ? char.owner : char;
        let caller: IKnownCard[] = [this];
        if(TG.isCard(char)) {
            caller.push(char);
        }
        return [ p, caller ];
    }
}

abstract class Event extends KnownCard implements IEvent {
    public readonly card_type = CardType.Event;
    public can_play_phase = [GamePhase.InAction];
    public abstract readonly is_ending: boolean;
    public abstract readonly score: number;
    public abstract readonly goal_progress_count: number;
    public abstract init_time_count: number;
    private _cur_progress_count = 0;
    public get cur_progress_count() { return this._cur_progress_count; };
    private _time_count_upward = 0;
    public get cur_time_count() { return this.init_time_count - this._time_count_upward; }
    public readonly push_cost = C.PUSH_COST;

    public is_finished = false;

    public readonly add_countdown_chain = new ActionChain<{ n: number, is_natural: boolean }>();
    public readonly add_progress_chain = (() => {
        // NOTE: 因為幾乎每個事件都需要檢查推進條件，這裡就統一把它放進鏈裡當軟性規則
        let chain = new ActionChain<{ char: ICharacter | null, n: number, is_push: boolean }>();
        chain.appendCheck(({ char, is_push }) => {
            if(is_push && !this.checkCanPush(char, -1)) { // FIXME: 這裡的-1應該是傳進來的nonce
                return { var_arg: "不符合推進條件" };
            }
        }, undefined, RuleEnums.CustomPushCheck);
        return chain;
    })();

    public readonly get_push_cost_chain = new GetterChain<number, ICharacter | null>();
    public readonly fail_chain = new ActionChain<null>();
    public readonly finish_chain = new ActionChain<ICharacter | null>();

    public abstract checkCanPush(char: ICharacter | null, nonce?: number): boolean;
    public abstract onPush(char: ICharacter | null, nonce?: number): Promise<void> | void;
    public abstract onFinish(char: ICharacter | null): Promise<void> | void;
    public onFail() { }
    public abstract setupFinishEffect(char: ICharacter | null): void;

    public setProgrss(progress: number) {
        this._cur_progress_count = progress;
    }
    public setTimeCount(time_count: number) {
        this._time_count_upward = this.init_time_count - time_count;
    }
    public addGetterWhileOngoing<T, U>(chain: GetterChain<T, U>[]|GetterChain<T, U>,
        func: GetterFunc<T, U>, append = true
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addGetterWhileOngoing(c, func, append);
            }
        } else {
            if(append) {
                return chain.append(func, () => !this.is_finished);
            } else {
                return chain.dominant(func, () => !this.is_finished);
            }
        }
    }
    protected addActionWhileOngoing<U>(chain: ActionChain<U>[]|ActionChain<U>,
        func: ActionFunc<U>, append = true
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addActionWhileOngoing(c, func, append);
            }
        } else {
            if(append) {
                return chain.append(func, () => !this.is_finished);
            } else {
                return chain.dominant(func, () => !this.is_finished);
            }
        }
    }
    protected addCheckWhileOngoing<U>(chain: ActionChain<U>[]|ActionChain<U>,
        func: CheckFunc<U>, append = true
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.addActionWhileOngoing(c, func, append);
            }
        } else {
            if(append) {
                return chain.appendCheck(func, () => !this.is_finished);
            } else {
                return chain.dominantCheck(func, () => !this.is_finished);
            }
        }
    }
}

abstract class Spell extends KnownCard implements ISpell {
    public readonly card_type = CardType.Spell;
    public readonly max_caster: number = 0;
    public readonly min_caster: number = 0;

    readonly data = {
        casters: new Array<ICharacter>()
    };

    constructor(seq: number,  owner: Player, g_master: GameMaster, abs_name: string) {
        super(seq, owner, g_master, abs_name);
        this.check_before_play_chain.append(() => {
            let casters_may_be = this.getMaybeCasters();
            if(casters_may_be.length < this.min_caster) {
                return { var_arg: false };
            }
        });
    }

    protected getMaybeCasters() {
        return this.my_master.getAll(TG.isCharacter, ch => {
            return ch.char_status == CharStat.StandBy
                && ch.card_status == CardStat.Onboard
                && !ch.is_tired;
        });
    }

    public async initialize(): Promise<boolean> {
        while(true) {
            let caller = [this, ...this.data.casters];
            let cancel_ui = (this.data.casters.length < this.min_caster) ? null : "施放";
            let c = await this.g_master.selecter.cancelUI(cancel_ui).promptUI("指定施術者")
            .selectCard(this.owner, caller, buildConfig({
                guard: TG.isCharacter,
                owner: this.owner,
                char_stat: CharStat.StandBy,
                is_tired: false,
            }));
            if(c) {
                let cancel = false;
                for(let [i, card] of this.data.casters.entries()) {
                    if(card.isEqual(c)) {
                        this.data.casters = [
                            ...this.data.casters.slice(0, i),
                            ...this.data.casters.slice(i + 1)
                        ];
                        cancel = true;
                        break;
                    }
                }
                if(!cancel) {
                    this.data.casters.push(c);
                    if(this.data.casters.length == this.max_caster) {
                        break;
                    }
                }
            } else {
                break;
            }
        }
        if(this.data.casters.length < this.min_caster) {
            return false;
        } else {
            return this.my_master.checkCanPlay(this);
        }
    }
    async onPlay() {
        for(let c of this.data.casters) {
            await this.my_master.changeCharTired(c, true);
        }
    }
}

export { KnownCard, Upgrade, Character, Arena, Event, Spell };