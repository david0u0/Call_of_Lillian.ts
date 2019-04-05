import { Player, GamePhase } from "./enums";
import { ActionChain } from "./hook";
import { Constant } from "./general_rules";

export class TimeMaster {
    private _cur_player = Player.Player1;
    public get cur_player() { return this._cur_player; }
    private _action_point = 0;
    public get action_point() { return this._action_point; }
    private _cur_phase = GamePhase.Building;
    public get cur_phase() { return this._cur_phase; }

    private _resting1 = false;
    private _resting2 = false;

    public readonly set_action_point_chain = new ActionChain<number>();
    public readonly end_turn_chain = new ActionChain<{ prev: Player, next: Player }>();

    /** 會跳過所有行動鏈，因此請儘量避免 */
    public async dangerouslySetRest(player: Player) {
        if(player == Player.Player1) {
            this._resting1 = true;
        } else {
            this._resting2 = true;
        }
        if(this._resting1 && this._resting2) {
            // TODO: 結束主階段
        } else {
            this.addActionPoint(-10);
        }
    }

    public checkResting(player: Player) {
        if(player == Player.Player1) {
            return this._resting1;
        } else {
            return this._resting2;
        }
    }

    public someoneHasRested() {
        return this._resting1 || this._resting2;
    }

    public async addActionPoint(n: number) {
        let new_action_point = Math.max(0, this._action_point + n);
        await this.set_action_point_chain.trigger(new_action_point, async () => {
            this._action_point = new_action_point;
            if(this._action_point == 0) {
                let new_player = 1 - this._cur_player;
                this._action_point = Constant.INIT_ACTION_POINT;
                if(this.checkResting(new_player)) {
                    // 繼續同一個玩家的回合
                    await this.endTurn(this._cur_player);
                } else {
                    // 轉換使用權
                    await this.endTurn(new_player);
                }
            } else {
                // TODO: 暫時轉換使用權讓對手打瞬間牌？
            }
        });
    }
    public async endTurn(next_player: Player) {
        this.end_turn_chain.trigger({ prev: this._cur_player, next: next_player }, () => {
            this._cur_player = next_player;
        });
    }
}