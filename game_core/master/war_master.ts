import { IArena, ICharacter, ICard, ISelecter, TypeGaurd as TG } from "../interface";
import { Player, GamePhase, CharStat, CardStat } from "../enums";
import { TimeMaster } from "./time_master";
import { BadOperationError, throwIfIsBackend } from "../errors";
import { ActionChain, ActionFunc, GetterChain, GetterFunc } from "../hook";
import { Constant } from "../general_rules";
import { PlayerMaster } from "./player_master";
import { ActionChainFactory } from "./action_chain_factory";

export enum DetailedWarPhase { Attaking, Blocking, Conflict, None };
export enum ConflictEnum { Attacking, Blokcing, Targeted, OutOfConflict, OutOfWar };
/**
 * 流程：將遊戲進程設為InWar => 進行數次衝突 => 結束戰鬥 => 將遊戲進程設為InAction => 告知時間管理者減少行動點。
 */
export class WarMaster {
    constructor(private acf: ActionChainFactory,
        private t_master: TimeMaster, private card_table: { [seq: number]: ICard },
        private getMyMaster: (arg: Player | ICard) => PlayerMaster,
        private getEnemyMaster: (arg: Player | ICard) => PlayerMaster
    ) { };

    private _war_seq = 0;
    /** 避免開戰後完全不攻擊就結束 */
    private _has_attacked = false;

    private _detailed_phase = DetailedWarPhase.None;
    public get detailed_phase() { return this._detailed_phase; }

    private checkBasic(player: Player, char?: ICharacter, conflict_stat?: ConflictEnum) {
        if(char) {
            if(char.owner != player) {
                return false;
            } else if(char.card_status != CardStat.Onboard) {
                throw new BadOperationError("不在場上的角色也想參與戰鬥？");
            } else if(this.t_master.cur_phase == GamePhase.InWar) {
                if(char.char_status != CharStat.InWar) {
                    return false;
                } else if(typeof (conflict_stat) != "undefined"
                    && this.getConflictEnum(char) != conflict_stat
                ) {
                    return false;
                }
            } else if(char.char_status != CharStat.InArena) {
                throw new BadOperationError("只有場所中的角色可參加戰鬥");
            }
        }
        return true;
    }
    public getConflictEnum(char: ICharacter | null) {
        if(!char || char.char_status != CharStat.InWar) {
            return ConflictEnum.OutOfWar;
        } else if(char.seq in this.conflict_table) {
            return ConflictEnum.Attacking;
        } else if(char.isEqual(this.target)) {
            return ConflictEnum.Targeted;
        } else {
            for(let atk_seq in this.conflict_table) {
                if(char.isEqual(this.conflict_table[atk_seq])) {
                    return ConflictEnum.Blokcing;
                }
            }
        }
        return ConflictEnum.OutOfConflict;
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
    public readonly declare_war_chain = this.acf.new<{ declarer: Player, arena: IArena }>();
    public readonly before_conflict_chain
        = this.acf.new<{ def: ICharacter, atk: ICharacter[], is_target: boolean }>();
    public readonly after_conflict_chain
        = this.acf.new<{ def: ICharacter, atk: ICharacter[], is_target: boolean }>();
    public readonly repulse_chain
        = this.acf.new<{ loser: ICharacter, winner: ICharacter[] }>();
    public readonly end_war_chain = this.acf.new<null>();

    public readonly start_attack_chain
        = this.acf.new<null>();
    public readonly set_block_chain
        = this.acf.new<null>();

    public addActionForThisWar<U>(append: boolean, chain: ActionChain<U>, func: ActionFunc<U>) {
        let war_seq = this._war_seq;
        if(append) {
            chain.append(func, () => (war_seq == this._war_seq));
        } else {
            chain.dominant(func, () => (war_seq == this._war_seq));
        }
    }
    public addGetterForThisWar<T, U>(append: boolean, chain: GetterChain<T, U>, func: GetterFunc<T, U>) {
        let war_seq = this._war_seq;
        if(append) {
            chain.append(func, () => (war_seq == this._war_seq));
        } else {
            chain.dominant(func, () => (war_seq == this._war_seq));
        }
    }
    public inMainField(char?: ICharacter) {
        if(this.war_field) {
            if(char) {
                return this.war_field.isEqual(char.data.arena_entered);
            } else {
                return true;
            }
        } else {
            return false;
        }
    } 
    public getAllWarFields(arena = this._war_field) {
        if(!arena) {
            return [];
        } else {
            let arenas = [];
            for(let a of this.getMyMaster(arena).arenas) {
                if(Math.abs(a.data.position - arena.data.position) <= 1) {
                    arenas.push(a);
                }
            }
            for(let a of this.getEnemyMaster(arena.owner).arenas) {
                if(Math.abs(a.data.position - arena.data.position) == 0) {
                    arenas.push(a);
                }
            }
            return arenas;
        }
    }
    public checkCanDeclare(declarer: Player, arena: IArena, _nonce?: number) {
        if(this.t_master.cur_player != declarer) {
            throw new BadOperationError("想在別人的回合宣戰？");
        } else if(this.t_master.cur_phase != GamePhase.InAction) {
            throw new BadOperationError("只能在主階段的行動中宣戰");
        } else {
            let nonce = typeof _nonce == "undefined" ? this.t_master.nonce : _nonce;
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
                        return this.declare_war_chain.checkCanTrigger({ declarer, arena }, nonce);
                    }
                }
            }
            throwIfIsBackend("我方沒有可攻擊的角色");
            return false;
        }
    }
    public async declareWar(declarer: Player, arena: IArena, by_keeper: boolean) {
        let nonce = this.t_master.nonce;
        if(!this.checkCanDeclare(declarer, arena, nonce)) {
            if(this.declare_war_chain.err_msg) {
                throwIfIsBackend(this.declare_war_chain.err_msg);
            }
            return;
        }
        let pm = this.getMyMaster(declarer);
        let cost = this.get_declare_cost_chain
        .trigger(Constant.WAR_COST, { declarer, arena }, nonce);
        if(pm.mana >= cost) {
            await pm.addMana(-cost);
            let res = await this.declare_war_chain.byKeeper(by_keeper)
            .trigger({ declarer, arena }, nonce, () => {
                this.t_master.setWarPhase(GamePhase.InWar);
                this._atk_player = declarer;
                this._def_player = 1 - declarer;
                this._war_field = arena;
                this._atk_win_count = this._def_win_count = 0;
                this.setupWar();
            });
            return true;
        } else {
            throwIfIsBackend("取消宣戰");
            return false;
        }
    }
    private setupWar() {
        this._has_attacked = false;
        this._detailed_phase = DetailedWarPhase.Attaking;
        if(this.war_field) {
            for(let a of this.getAllWarFields(this.war_field)) {
                for(let c of a.char_list) {
                    if(c) {
                        c.char_status = CharStat.InWar;
                    }
                }
            }
        }
    }
    public checkCanAttack(atk: ICharacter | ICharacter[], target?: ICharacter) {
        if(!this.checkBasic(this.def_player, target) || !this.inMainField(target)) {
            return false;
        } else {
            if(target) {
                let role = this.getMyMaster(target).getBattleRole(target);
                if(role.can_not_be_target) {
                    return false;
                }
            }
        }

        if(atk instanceof Array) {
            for(let a of atk) {
                if(!this.checkCanAttack(a, target)) {
                    return false;
                }
            }
            return true;
        } else {
            if(!this.checkBasic(this.atk_player, atk) || atk.is_tired) {
                return false;
            } else {
                let atk_role = this.getMyMaster(atk).getBattleRole(atk);
                if(!atk_role.can_attack) {
                    return false;
                }
            }
            return true;
        }
    }
    public checkCanBlock(blocker: ICharacter, atk?: ICharacter) {
        if(!this.checkBasic(this.def_player, blocker)
            || blocker.isEqual(this.target) // 被當作目標的角色無法格擋
            || blocker.is_tired
        ) {
            return false;
        } else if(!this.checkBasic(this.atk_player, atk, ConflictEnum.Attacking)) {
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
        if(this.t_master.cur_player != this.atk_player) {
            throw new BadOperationError("還沒輪到你攻擊！");
        }
        if(!this.checkCanAttack(atk_chars, target)) {
            throw new BadOperationError("不可攻擊");
        } else {
            this._conflict_table = {};
            this._target = null;
            this._has_attacked = true;
            this._target = target;
            for(let ch of atk_chars) {
                this._conflict_table[ch.seq] = target;
            }
            this.t_master.startTurn(this.def_player);
            // 開始進行格擋
            await this.start_attack_chain.byKeeper().trigger(null, this.t_master.nonce);
            this._detailed_phase = DetailedWarPhase.Blocking;
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
            await this.set_block_chain.byKeeper().trigger(null, this.t_master.nonce);
        }
    }

    public async startConflict() {
        this._detailed_phase = DetailedWarPhase.Conflict;
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
        if(this.target && rest_atkers.length > 0) {
            await this.doSingleConflict(rest_atkers, this.target, true);
        }
        this._detailed_phase = DetailedWarPhase.Attaking;
    }
    private async doSingleConflict(atk_chars: ICharacter[], def: ICharacter, is_target: boolean) {
        let nonce = this.t_master.nonce;
        let res = await this.before_conflict_chain
        .trigger({ atk: atk_chars, def, is_target }, nonce);
        if(res) {
            // TODO: 應該由防守方來決定 atk_chars 的順序
            let tar_strength = this.getMyMaster(def).getStrength(def);
            let atk_strength = 0;
            for(let atk of atk_chars) {
                atk_strength += this.getMyMaster(atk).getStrength(atk, def);
            }
            if(atk_strength < tar_strength) {
                await this.repulseChar(atk_chars, [def]);
                this._def_win_count += atk_chars.length;
            } else if(atk_strength > tar_strength) {
                await this.repulseChar(def, atk_chars);
                this._atk_win_count++;
            } else {
                await this.repulseChar(atk_chars, [def]);
                await this.repulseChar(def, atk_chars);
            }
        }
        await this.after_conflict_chain
        .trigger({ atk: atk_chars, def, is_target }, nonce, async () => {
            // 令所有參戰者陷入疲勞
            await this.getMyMaster(def).changeCharTired(def, true);
            
            for(let atk of atk_chars) {
                await this.getMyMaster(atk).changeCharTired(atk, true);
            }
        });
    }
    public async repulseChar(loser: ICharacter|ICharacter[], winner: ICharacter[]=[]) {
        if(loser instanceof Array) {
            for(let char of loser) {
                await this.repulseChar(char, winner);
            }
        } else {
            await this.repulse_chain.chain(loser.repulse_chain, winner)
            .trigger({ loser, winner }, this.t_master.nonce, async () => {
                await this.getMyMaster(loser).exitArena(loser);
            });
        }
    }
    public isWinner(player: Player) {
        if(player == this.atk_player) {
            return (this.atk_win_count > this.def_win_count);
        } else {
            return (this.atk_win_count < this.def_win_count);
        }
    }
    public async endWar(by_keeper: boolean): Promise<boolean> {
        if(!this._has_attacked && by_keeper) {
            throwIfIsBackend("至少要攻擊一次才可停戰");
            return false;
        } else {
            await this.end_war_chain.byKeeper(by_keeper)
            .trigger(null, this.t_master.nonce,() => {
                this._detailed_phase = DetailedWarPhase.None;
                this.t_master.setWarPhase(GamePhase.EndWar);
            });
            // TODO: 讓玩家可以執行某些行動
            await this.t_master.startTurn(this.atk_player);
            // 所有參與的角色從疲勞中恢復，且角色狀態改回 InArena
            for(let p of [Player.Player1, Player.Player2]) {
                let pm = this.getMyMaster(p);
                for(let c of pm.getAll(TG.isCharacter, c => c.char_status == CharStat.InWar)) {
                    c.char_status = CharStat.InArena;
                    await pm.changeCharTired(c, false);
                }
            }
            this.t_master.setWarPhase(GamePhase.InAction);
            this._war_seq++; // 每次戰鬥的編號都會增加
            await this.t_master.spendAction();
            return true;
        }
    }
}