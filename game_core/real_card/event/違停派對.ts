import { Event } from "../../cards";
import { IEvent, ICharacter } from "../../interface";

let name = "違停派對";
let description = `當你打出*違停派對*，得到6魔力。
結算：你得到5魔力。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 1;
    readonly goal_progress_count = 2;
    readonly init_time_count = 2;

    basic_mana_cost = 4;

    checkCanPush(char: ICharacter|null) {
        return true;
    }

    async onPlay() {
        await this.my_master.addMana(6);
    }

    async onFinish() {
        await this.my_master.addMana(5);
    }

    onPush() { }

    setupFinishEffect() { }
}