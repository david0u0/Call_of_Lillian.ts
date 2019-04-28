import { Event } from "../../cards";
import { IEvent, ICharacter } from "../../interface";

let name = "尋貓啟事";
let description = "";

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 1;
    readonly goal_progress_count = 1;
    readonly init_time_count = 1;

    basic_mana_cost = 0;

    checkCanPush(char: ICharacter|null) { return false; }
    onPush() { }
    onFinish() { }
    setupFinishEffect() { }
}