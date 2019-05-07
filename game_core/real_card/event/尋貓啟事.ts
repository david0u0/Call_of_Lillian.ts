import { Event } from "../../cards";
import { IEvent, ICharacter } from "../../interface";
import { CardStat } from "../../enums";

let name = "尋貓啟事";
let description = "";

export default class E extends Event implements IEvent {
    name = name;
    description = description;
    deck_count = 0;

    readonly is_ending = false;
    readonly score = 1;
    readonly goal_progress_count = 1;
    readonly init_time_count = 1;
    is_finished = true;

    basic_mana_cost = 0;

    checkCanPush() { return false; }
    onPush() { }
    onFinish() { }
    setupFinishEffect() { }
}