import { Event } from "../../cards";
import { IEvent, ICharacter } from "../../interface";
import { Player } from "../../enums";

let name = "第一試煉";
let description = "推進：你得到3魔力，並使推進本事件的角色戰力增加1。";

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 1;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;

    basic_mana_cost = 4;

    checkCanPush(char: ICharacter | null) {
        return true;
    }

    async onPlay() { }

    async onFinish() { }

    onPush(char: null | ICharacter) {
        if(char) {
            char.data.str_counter += 1;
        }
        this.my_master.addMana(3);
    }

    setupFinishEffect() { }
}