import { Event, Arena } from "../../cards";
import { IEvent, ICharacter, TypeGaurd as TG } from "../../interface";
import { CardSeries, Player } from "../../enums";

let name = "火力鎮壓";
let description = `推進：角色戰力需大於0。
結算：每當你休息時，若你在場所中的角色數比對手多2以上，對其造成1情緒傷害。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;
    readonly basic_mana_cost = 4;
    readonly score = 1;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;
    readonly is_ending = false;

    checkCanPush(char: ICharacter|null) {
        if(char) {
            return this.my_master.getStrength(char) > 0;
        } else {
            return true;
        }
    }

    onFinish() { }
    onPush() { }

    setupFinishEffect() {
        this.addActionWhileAlive(true, this.g_master.t_master.rest_chain, (player) => {
            if(player == this.owner) {
                this.enemy_master.addEmo(1);
            }
        });
    }
}