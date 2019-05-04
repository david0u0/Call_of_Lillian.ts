import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd } from "../../interface";
import { CardSeries, Player, CardStat, checkBelongToSeries } from "../../enums";

let name = "真正的魔法";
let description = `推進：你必須有兩個或更多角色處於休閒場所→將一張*尋貓啟事*加入結算區。
結算：雙方所有非結局事件額外增加1分。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = true;
    readonly score = 0;
    readonly goal_progress_count = 4;
    readonly init_time_count = 3;

    basic_mana_cost = 3;

    checkCanPush() {
        let list = this.my_master.getAll(TypeGaurd.isCharacter, char => {
            if(char.data.arena_entered) {
                let arena = char.data.arena_entered;
                if(checkBelongToSeries(CardSeries.Hospital, arena.series)) {
                    return true;
                }
            }
            return false;
        });
        return (list.length > 0);
    }

    async onPush() {
        await this.g_master.genCardToBoard(this.owner, "尋貓啟事");
    }

    onFinish() { }
    setupFinishEffect() {
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            pm.get_score_chain.append(score => {
                let evts = pm.events_finished.filter(e => !e.is_ending);
                return { var_arg: evts.length + score };
            });
        }
    }
}