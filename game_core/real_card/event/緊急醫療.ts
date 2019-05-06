import { Event, Arena } from "../../cards";
import { IEvent, ICharacter, TypeGaurd as TG } from "../../interface";
import { CardSeries, Player, checkBelongToSeries } from "../../enums";

let name = "緊急醫療";
let description = `推進：你必須有角色處於醫院→得到1魔力。
結算：你每個時代的魔力收入加2。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 2;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;

    basic_mana_cost = 3;

    checkCanPush(_char: ICharacter|null) {
        let list = this.my_master.getAll(TG.isCharacter, char => {
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

    onPush(char: ICharacter|null) {
        if(char) {
            this.my_master.addMana(1, [char]);
        } else {
            this.my_master.addMana(1);
        }
    }

    onFinish() { }

    setupFinishEffect() {
        this.addActionWhileAlive(this.g_master.t_master.start_exploit_chain, () => {
            this.my_master.addMana(2, [this]);
        });
    }
}