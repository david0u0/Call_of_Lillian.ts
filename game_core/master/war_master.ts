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
    constructor(private t_master: TimeMaster, private card_table: { [seq: number]: ICard },
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
        = new ActionChain<null>();
    public readonly set_block_chain
        = new ActionChain<null>();

    public addActionForThisWar<U>(chain: ActionChain<U>, func: ActionFunc<U>) {
        let hook = chain.append(func, -1);
        this.end_war_chain.append(() => {
            hook.active_countdown = 0;
        });
    }
    public inMainField(char?: ICharacter) {
        if(this.war_field) {
            if(char) {
                return this.war_field.isEqual(char.arena_entered);
            } else {
                return true;
            }
        } else {
            return false;
        }
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
            this._war_field = arena;
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
            } else if(!this.checkBasic(this.def_player, CharStat.InWar, target) || !this.inMainField(target)) {
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
        if(!this.checkBasic(this.def_player, CharStat.InWar, blocker)
            || blocker.isEqual(this.target)
            || blocker.is_tired
        ) {
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

    private _conflict_table: { [atk_seq: number]: ICharacter } = {};
    public get conflict_table() { return this._conflict_table; }
    private _target: ICharacter | null = null;
    public get target() { return this._target; }
    public async startAttack(atk_chars: ICharacter[], target: ICharacter) {
        // TODO: 應該把戰鬥切分成更多步驟，不該只用 cur_player 來判斷輪到誰攻擊
        if(this.t_master.cur_player != this.atk_player) {
            throw new BadOperationError("還沒輪到你攻擊！");
        }
        if(!this.checkCanAttack(atk_chars, target)) {
            throw new BadOperationError("不可攻擊");
        } else {
            this._target = target;
            for(let ch of atk_chars) {
                ch.char_status = CharStat.Attacking;
                this._conflict_table[ch.seq] = target;
            }
            this.t_master.startTurn(this.def_player);
            // 開始進行格擋
            await this.start_attack_chain.byKeeper().trigger(null);
            await this.t_master.startTurn(this.def_player);
        }
    }
    
    private clearBlock(block_char: ICharacter) {
        for(let atk_seq in this._conflict_table) {
            if(this._conflict_table[atk_seq].isEqual(block_char) && this.target) {
                this._conflict_table[atk_seq] = this.target;
            }
        }
    }
    public async setBlock(atk_char: ICharacter | null, block_char: ICharacter) {
        if(this.t_master.cur_player != this.def_player) {
            throw new BadOperationError("還沒輪到你格擋！");
        } else if(atk_char && !this.checkCanBlock(block_char, atk_char)) {
            throw new BadOperationError("不可格擋");
        } else {
            // 避免一個角色格擋多個進攻者
            this.clearBlock(block_char);
            if(atk_char) {
                this._conflict_table[atk_char.seq] = block_char;
            }
            await this.set_block_chain.byKeeper().trigger(null);
        }
    }

    public async startConflict() {
        await this.t_master.startTurn(this.atk_player);
        // 逐一比較戰力
        let rest_atkers = new Array<ICharacter>();
        for(let atk_seq in this.conflict_table) {
            let def = this.conflict_table[atk_seq];
            let atk = this.card_table[atk_seq];
            if(TG.isCharacter(atk)) {
                if(def.isEqual(this.target)) {
                    rest_atkers.push(atk);
                } else {
                    await this.doSingleConflict([atk], def, false);
                }
            } else {
                throw new BadOperationError("不是角色卡", atk);
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