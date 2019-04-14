import { IArena, ICharacter, ICard } from "../interface";
import { Player, GamePhase, CharStat } from "../enums";
import { TimeMaster } from "./time_master";
import { BadOperationError } from "../errors";
import { ActionChain, ActionFunc, GetterChain } from "../hook";
import { Constant } from "../general_rules";
import { PlayerMaster } from "./player_master";

/**
 * 流程：將遊戲進程設為InWar => 進行數次衝突 => 結束戰鬥 => 將遊戲進程設為InAction => 告知時間管理者減少行動點。
 */
export class WarMaster {
    constructor(private t_master: TimeMaster,
        private getMyMaster: (arg: Player|ICard) => PlayerMaster,
        private getEnemyMaster: (arg: Player|ICard) => PlayerMaster
    ) { };

    private _atk_player: Player = 0;
    private _def_player: Player = 0;
    private _war_field: IArena = null;
    public get atk_player() { return this._atk_player; }
    public get def_player() { return this._def_player; }
    public get war_field() { return this._war_field; }

    public readonly declare_war_chain = new ActionChain<{ player: Player, arena: IArena }>();
    public readonly end_war_chain = new ActionChain<{ player: Player, arena: IArena }>();
    public readonly get_declare_cost_chain
        = new GetterChain<number, { player: Player, arena: IArena }>();

    public addActionForThisWar<U>(chain: ActionChain<U>, func: ActionFunc<U>) {
        let hook = chain.append(func, -1);
        this.end_war_chain.append(() => {
            hook.active_countdown = 0;
        });
    }

    public async declareWar(player: Player, arena: IArena, by_keeper: boolean) {
        if(this.t_master.cur_player != player) {
            throw new BadOperationError("想在別人的回合宣戰？");
        } else if(this.t_master.cur_phase != GamePhase.InAction) {
            throw new BadOperationError("只能在主階段的行動中宣戰");
        }
        let pm = this.getMyMaster(player);
        let cost = this.get_declare_cost_chain.trigger(Constant.WAR_COST, { player, arena });
        if(pm.mana >= cost) {
            pm.addMana(-cost);
            this.declare_war_chain.triggerByKeeper(by_keeper, { player, arena }, () => {
                this.t_master.setWarPhase(true);
                this._atk_player = player;
                this._def_player = 1-player;
                this.setupWar();
            });
        }
    }
    private setupWar() {
        let arenas = [];
        for(let a of this.getMyMaster(this.war_field).arenas) {
            if(Math.abs(a.position-this.war_field.position) <= 1) {
                arenas.push(a);
            }
        }
        for(let a of this.getEnemyMaster(this.war_field.owner).arenas) {
            if(Math.abs(a.position-this.war_field.position) == 0) {
                arenas.push(a);
            }
        }
        for(let a of arenas) {
            for(let c of a.char_list) {
                if(c && !c.way_worn) {
                    // 角色不是剛上場所，就讓它不再疲勞
                    this.getMyMaster(c).changeCharTired(c, false);
                    c.char_status = CharStat.InBattle;
                }
            }
        }
    }

    public checkCanAttack(atk: ICharacter, target: ICharacter) {
        if(atk.owner != this.atk_player || target.owner != this.def_player || atk.is_tired) {
            return false;
        } else {
            let atk_role = this.getMyMaster(atk).getBattleRole(atk);
            let tar_role = this.getMyMaster(target).getBattleRole(target);
            if(!atk_role.can_attack || tar_role.can_not_be_attacked) {
                return false;
            }
        }
        return true;
    }
    public checkCanBlock(blocker: ICharacter, atk: ICharacter) {
        if(blocker.owner != this.def_player || blocker.is_tired) {
            return false;
        } else {
            let atk_role = this.getMyMaster(atk).getBattleRole(atk);
            let block_role = this.getMyMaster(blocker).getBattleRole(blocker);
            if(atk_role.can_not_be_blocked || !block_role.can_block) {
                return false;
            }
        }
        return true;
    }

    public startAttack(atks: ICharacter[], target: ICharacter) {
        // NOTE: 檢查角色是否真的可以為戰鬥狀態
    }
}