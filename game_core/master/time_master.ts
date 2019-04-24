import { Player, GamePhase } from "../enums";
import { BadOperationError, throwDevError } from "../errors";
import { ActionChainFactory } from "./action_chain_factory";

const BUILDING_ACTION_P = 1;
const MAIN_FIRST_ACTION_P = 1;
const MAIN_DEFAULT_ACTION_P = 2;

export class TimeMaster {
    private _cur_player = Player.Player1;
    public get cur_player() { return this._cur_player; }
    private _action_point = -1;
    public get action_point() { return this._action_point; }
    private _cur_phase = GamePhase.Setup;
    public get cur_phase() { return this._cur_phase; }
    private first_player = Player.Player1;

    public readonly start_building_chain = this.acf.new<null>();
    public readonly start_main_chain = this.acf.new<null>();
    public readonly start_exploit_chain = this.acf.new<null>();
    public readonly spend_action_chain = this.acf.new<null>();

    private era_index = 0;
    private action_index = 0;

    constructor(private acf: ActionChainFactory) { }

    public addActionForThisAction<U>() {

    }
    public addGetterForThisAction<T, U>() {

    }

    public async startBulding() {
        await this.start_building_chain.trigger(null, async () => {
            this.era_index++;
            await this.setRest(Player.Player1, false);
            await this.setRest(Player.Player2, false);
            this._cur_phase = GamePhase.Building;
            await this.startTurn(this.first_player);
        });
    }
    public async startMainPhase() {
        await this.start_main_chain.trigger(null, async () => {
            await this.setRest(Player.Player1, false);
            await this.setRest(Player.Player2, false);
            this._cur_phase = GamePhase.InAction;
            await this.startTurn(this.first_player);
            this._action_point = MAIN_FIRST_ACTION_P; // 第一個回合的行動點不同
        });
    }
    public async startExploit() {
        await this.setRest(Player.Player1, false);
        await this.setRest(Player.Player2, false);
        await this.start_exploit_chain.trigger(null, async () => {
            this._cur_phase = GamePhase.Exploit;
            await this.startTurn(this.first_player);
        });
    }

    private _resting1 = false;
    private _resting2 = false;
    public readonly rest_state_change_chain = this.acf.new<{ resting: boolean, player: Player }>();
    /** 專門指涉主階段中的休息 */
    public readonly rest_chain = this.acf.new<Player>();

    public async rest(player: Player, by_keeper: boolean) {
        if(this.cur_player != player) {
            throw new BadOperationError("想在別人的回合休息？");
        } else if(this.cur_phase != GamePhase.InAction
            && this.cur_phase != GamePhase.Building
            && this.cur_phase != GamePhase.Exploit
        ) {
            throw new BadOperationError("只能在建築階段/主階段/收獲階段休息");
        }
        if(player == Player.Player1 && this._resting1) {
            throw new BadOperationError("已經在休息了");
        } else if(player == Player.Player2 && this._resting2) {
            throw new BadOperationError("已經在休息了");
        }
        if(this._cur_phase == GamePhase.InAction) {
            await this.rest_chain.byKeeper(by_keeper).trigger(player, () => {
                if(!this.someoneResting()) {
                    // 下個世代的起始玩家
                    this.first_player = player;
                }
            });
        }
        this.setRest(player, true);
    }

    private async setRest(player: Player, resting: boolean) {
        this.rest_state_change_chain.trigger({ resting, player }, () => {
            if(resting == false) {
                // 重置
            } else {
                // 休息
                if(this.someoneResting()) {
                    if(this.cur_phase == GamePhase.Building) {
                        this.startMainPhase();
                    } else if(this.cur_phase == GamePhase.InAction) {
                        this.startExploit();
                    } else if(this.cur_phase == GamePhase.Exploit) {
                        this.startBulding();
                    }
                } else {
                    this.startTurn(1 - player);
                }
            }
            if(player == Player.Player1) {
                this._resting1 = resting;
            } else {
                this._resting2 = resting;
            }
        });
    }

    public readonly set_action_point_chain = this.acf.new<number>();
    public readonly start_turn_chain = this.acf.new<{ prev: Player, next: Player }>();

    public checkResting(player: Player) {
        if(player == Player.Player1) {
            return this._resting1;
        } else {
            return this._resting2;
        }
    }

    public someoneResting() {
        return this._resting1 || this._resting2;
    }

    public async spendAction() {
        if(this.cur_phase != GamePhase.InAction) {
            return;
        } else {
            this.spend_action_chain.trigger(null, async () => {
                this.action_index++;
                await this.addActionPoint(-1);
            });
        }
    }
    public async addActionPoint(n: number) {
        let new_action_point = Math.max(0, this._action_point + n);
        await this.set_action_point_chain.trigger(new_action_point, async () => {
            this._action_point = new_action_point;
            if(this._action_point == 0) {
                let new_player = 1 - this._cur_player;
                if(this.checkResting(new_player)) {
                    // 繼續同一個玩家的回合
                    await this.startTurn(this._cur_player);
                } else {
                    // 轉換使用權
                    await this.startTurn(new_player);
                }
            } else {
                // TODO: 暫時轉換使用權讓對手打瞬間牌？
            }
        });
    }
    public async startTurn(next_player: Player) {
        await this.start_turn_chain.trigger({ prev: this._cur_player, next: next_player }, async () => {
            this._cur_player = next_player;
            if(this.cur_phase == GamePhase.InAction) {
                this._action_point = 0;
                await this.addActionPoint(MAIN_DEFAULT_ACTION_P);
            }
        });
    }
    public setWarPhase(phase: GamePhase.InWar|GamePhase.InAction|GamePhase.EndWar) {
        this._cur_phase = phase;
    }
}