import { Event } from "../../cards";
import { IEvent, ICharacter } from "../../interface";

let name = "生命、宇宙與萬事萬物的答案";
let description = "42";

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = true;
    readonly score = 42;
    readonly goal_progress_count = 6;
    readonly init_time_count = 7;

    basic_mana_cost = 42;

    checkCanPush(char: ICharacter|null) {
        return true;
    }

    onPush() {
        this.my_master.addMana(42);
    }

    onFinish() { }
}