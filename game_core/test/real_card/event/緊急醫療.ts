import { Event, Arena } from "../../../cards";
import { IEvent, ICharacter, TypeGaurd as TG } from "../../../interface";
import { CardSeries } from "../../../enums";

let name = "緊急醫療";
let description = `推進：你有一個以上的角色處於醫院->得到2魔力。
結算：你每個時代的魔力收入加2。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 2;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;

    basic_mana_cost = 4;

    checkCanPush(_char: ICharacter|null) {
        let list = this.g_master.getAll(TG.isCharacter, char => {
            if(char.owner == this.owner) {
                if(char.arena_entered) {
                    let arena = char.arena_entered;
                    if(arena.series.indexOf(CardSeries.Hospital) != -1) {
                        return true;
                    }
                }
            }
            return false;
        });
        return (list.length > 0);
    }

    onPush() {
        this.my_master.addMana(2);
    }

    onFinish() {
        this.addActionWhileAlive(true, this.g_master.main_phase_end_chain, () => {
            this.my_master.addMana(2);
        });
    }
}