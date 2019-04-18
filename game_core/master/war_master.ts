import { IArena, ICharacter, ICard, ISelecter, TypeGaurd as TG } from "../interface";
import { Player, GamePhase, CharStat } from "../enums";
import { TimeMaster } from "./time_master";
import { BadOperationError, throwIfIsBackend } from "../errors";
import { ActionChain, ActionFunc, GetterChain } from "../hook";
import { Constant } from "../general_rules";
import { PlayerMaster } from "./player_master";

/**
 * 流程：將遊戲進程設為InWar => 進行數次衝突 => 結束戰鬥 => 將遊戲進程設為InAction => 告知時間管理者減少行動點。
 */
export class WarMaster {
    constructor(private t_master: TimeMaster, private selecter: ISelecter,
        private getMyMaster: (arg: Player | ICard) => PlayerMaster,
        private getEnemyMaster: (arg: Player | ICard) => PlayerMaster
    ) { };

    private checkBasic(player: Player, stat: CharStat, char?: ICharacter) {
        if(char) {
            if(char.owner != player) {
                return false;
            }
            else if(char.char_status != stat && this.t_master.cur_phase == GamePhase.InWar) {
                return false;
            }
        }
        return true;
    }

    private _atk_player: Player = 0;
    private _def_player: Player = 0;
    private _war_field: IArena | null = null;
    public get atk_player() { return this._atk_player; }
    public get def_player() { return this._def_player; }
    public get war_field() { return this._war_field; }

    private _atk_win_count = 0;
    private _def_win_count = 0;
    public get atk_win_count() { return this._atk_win_count; }
    public get def_win_count() { return this._def_win_count; }

    public readonly get_declare_cost_chain
        = new GetterChain<number, { declarer: Player, arena: IArena }>();
    public readonly declare_war_chain = new ActionChain<{ declarer: Player, arena: IArena }>();
    public readonly before_conflict_chain
        = new ActionChain<{ def: ICharacter, atk: ICharacter[], is_target: boolean }>();
    public readonly after_conflict_chain
        = new ActionChain<{ def: ICharacter, atk: ICharacter[], is_target: boolean }>();
    public readonly repluse_chain
        = new ActionChain<{ loser: ICharacter, winner?: ICharacter }>();
    public readonly end_war_chain = new ActionChain<null>();

    public readonly start_attack_chain
        = new ActionChain<{ atk_chars: ICharacter[], target: ICharacter }>();
    public readonly start_block_chain
        = new ActionChain<{ atk_chars: ICharacter[], atk_block_table: { [index: number]: ICharacter }}>();

    public addActionForThisWar<U>(chain: ActionChain<U>, func: ActionFunc<U>) {
        let hook = chain.append(func, -1);
        this.end_war_chain.append(() => {
            hook.active_countdown = 0;
        });
    }
    public getAllWarFields(arena: IArena) {
        let arenas = [];
        for(let a of this.getMyMaster(arena).arenas) {
            if(Math.abs(a.position - arena.position) <= 1) {
                arenas.push(a);
            }
        }
        for(let a of this.getEnemyMaster(arena.owner).arenas) {
            if(Math.abs(a.position - arena.position) == 0) {
                arenas.push(a);
            }
        }
        return arenas;
    }
    public checkCanDeclare(declarer: Player, arena: IArena) {
        if(this.t_master.cur_player != declarer) {
            throw new BadOperationError("想在別人的回合宣戰？");
        } else if(this.t_master.cur_phase != GamePhase.InAction) {
            throw new BadOperationError("只能在主階段的行動中宣戰");
        } else {
            this._atk_player = declarer;
            let has_target = false;
            for(let ch of arena.char_list) {
                if(ch && ch.owner != declarer) {
                    has_target = true;
                    break;
                }
            }
            if(!has_target) {
                throwIfIsBackend("敵方沒有可被攻擊的目標");
                return false;
            }
            for(let a of this.getAllWarFields(arena)) {
                for(let ch of a.char_list) {
                    if(ch && this.checkCanAttack(ch)) {
                        return true;
                    }
                }
            }
            throwIfIsBackend("我方沒有可攻擊的角色");
            return false;
        }
    }
    public async declareWar(declarer: Player, arena: IArena, by_keeper: boolean) {
        if(!this.checkCanDeclare(declarer, arena)) {
            return;
        }
        let pm = this.getMyMaster(declarer);
        let cost = this.get_declare_cost_chain.trigger(Constant.WAR_COST, { declarer, arena });
        if(pm.mana >= cost && this.declare_war_chain.checkCanTrigger({ declarer, arena })) {
            pm.addMana(-cost);
            let res = await this.declare_war_chain.byKeeper(by_keeper)
            .trigger({ declarer, arena }, () => {
                this.t_master.setWarPhase(GamePhase.InWar);
                this._atk_player = declarer;
                this._def_player = 1 - declarer;
                this._war_field = arena;
                this._atk_win_count = this._def_win_count = 0;
                this.setupWar();
            });
        }
    }
    private setupWar() {
        if(this.war_field) {
            for(let a of this.getAllWarFields(this.war_field)) {
                for(let c of a.char_list) {
                    if(c && !c.is_tired) {
                        c.char_status = CharStat.InWar;
                    }
                }
            }
        }
    }
    public checkCanAttack(atk: ICharacter | ICharacter[], target?: ICharacter) {
        if(atk instanceof Array) {
            for(let a of atk) {
                if(!this.checkCanAttack(a, target)) {
                    return false;
                }
            }
            return true;
        } else {
            if(!this.checkBasic(this.atk_player, CharStat.InWar, atk) || atk.is_tired) {
                return false;
            } else if(!this.checkBasic(this.def_player, CharStat.InWar, target)) {
                return false;
            } else {
                let atk_role = this.getMyMaster(atk).getBattleRole(atk);
                let can_not_be_attacked: boolean | undefined = false;
                if(target) {
                    ({ can_not_be_attacked } = this.getMyMaster(target).getBattleRole(target));
                }
                if(!atk_role.can_attack || can_not_be_attacked) {
                    return false;
                }
            }
            return true;
        }
    }
    public checkCanBlock(blocker: ICharacter, atk?: ICharacter) {
        if(!this.checkBasic(this.def_player, CharStat.InWar, blocker) || blocker.is_tired) {
            return false;
        } else if(!this.checkBasic(this.atk_player, CharStat.Attacking, atk)) {
            return false;
        } else {
            let block_role = this.getMyMaster(blocker).getBattleRole(blocker);
            let can_not_be_blocked: boolean | undefined = false;
            if(atk) {
                ({ can_not_be_blocked } = this.getMyMaster(atk).getBattleRole(atk));
            }
            if(can_not_be_blocked || !block_role.can_block) {
                return false;
            }
        }
        return true;
    }

    private atk_block_table: { [index: number]: ICharacter } = {};
    private atk_chars = new Array<ICharacter>();
    private target: ICharacter | null = null;
    public async startAttack(atk_chars: ICharacter[], target: ICharacter) {
        // NOTE: 檢查角色是否真的可以攻擊
        await this.start_attack_chain.byKeeper().trigger({ atk_chars, target });
        if(this.t_master.cur_player != this.atk_player) {
            throw new BadOperationError("還沒輪到你攻擊！");
        }
        if(!this.checkCanAttack(atk_chars, target)) {
            throwIfIsBackend("不可攻擊");
        } else {
            this.atk_chars = atk_chars;
            this.target = target;
            for(let ch of atk_chars) {
                ch.char_status = CharStat.Attacking;
            }
            this.t_master.startTurn(this.def_player);
            // 開始進行格擋
            this.atk_block_table = {};
            let blocker: ICharacter | null = null;
            while(true) {
                blocker = await this.selecter.selectCard(this.def_player, null,
                    TG.isCharacter, c => {
                        return this.checkCanBlock(c);
                    }
                );
                if(blocker) {
                    // TODO: 這裡目前還不能「取消選取」，一旦被選去格擋就結束了
                    let _blocker = blocker;
                    let atk_to_block = await this.selecter.selectCard(
                        this.def_player, null, TG.isCharacter, c => {
                            return this.checkCanBlock(_blocker, c);
                        }
                    );
                    if(atk_to_block) {
                        this.atk_block_table[atk_to_block.seq] = blocker;
                    }
                } else {
                    break;
                }
            }
        }
        await this.start_block_chain.byKeeper()
        .trigger({ atk_chars: this.atk_chars, atk_block_table: this.atk_block_table });
        await this.startConflict();
        await this.t_master.startTurn(this.atk_player);
    }
    private async startConflict() {
        // 逐一比較戰力
        let rest_atkers = new Array<ICharacter>();
        for(let char of this.atk_chars) {
            if(char.seq in this.atk_block_table) {
                await this.doSingleConflict([char], this.atk_block_table[char.seq], false);
            } else {
                rest_atkers.push(char);
            }
        }
        if(this.target) {
            await this.doSingleConflict(rest_atkers, this.target, true);
        }
    }
    private async doSingleConflict(atk_chars: ICharacter[], def: ICharacter, is_target: boolean) {
        let res = await this.before_conflict_chain.trigger({ atk: atk_chars, def, is_target });
        if(res) {
            // TODO: 應該由防守方來決定 atk_chars 的順序
            let tar_strength = this.getMyMaster(def).getStrength(def);
            for(let atk of atk_chars) {
                let atk_strength = this.getMyMaster(atk).getStrength(atk, def);
                if(atk_strength < tar_strength) {
                    this.repulseChar(atk, def);
                    tar_strength -= atk_strength;
                    this._def_win_count++;
                } else if(atk_strength > tar_strength) {
                    this.repulseChar(def, atk);
                    this._atk_win_count++;
                    break;
                } else {
                    this.repulseChar(atk);
                    this.repulseChar(def);
                    break;
                }
            }
        }
        await this.after_conflict_chain.trigger({ atk: atk_chars, def, is_target }, () => {
            // 令所有參戰者陷入疲勞
            this.getMyMaster(def).changeCharTired(def, true);
            for(let atk of atk_chars) {
                this.getMyMaster(atk).changeCharTired(atk, true);
            }
        });
    }
    public repulseChar(loser: ICharacter, winner?: ICharacter) {
        this.repluse_chain.trigger({ loser, winner }, () => {
            this.getMyMaster(loser).exitArena(loser);
        });
    }
    public isWinner(player: Player) {
        if(player == this.atk_player) {
            return (this.atk_win_count > this.def_win_count);
        } else {
            return (this.atk_win_count < this.def_win_count);
        }
    }
    public endWar() {
        this.t_master.setWarPhase(GamePhase.EndWar);
        // TODO: 讓玩家可以執行某些行動
        this.t_master.setWarPhase(GamePhase.InAction);
        this.end_war_chain.trigger(null);
        this.t_master.addActionPoint(-1);
    }
}