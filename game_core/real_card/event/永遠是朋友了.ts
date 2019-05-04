import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd as TG } from "../../interface";

let name = "「永遠是朋友了」";
let description = `超凡1（分數為1或以上才可出牌）
結算：從對手那裡奪取最多3魔力。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 2;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;

    basic_mana_cost = 3;

    check_before_play_chain = this.beyond(1);

    checkCanPush() {
        return true;
    }

    async onFinish() {
        let add_mana = Math.min(this.enemy_master.mana, 3);
        await this.my_master.addMana(add_mana, [this]);
        await this.enemy_master.addMana(-add_mana, [this]);
    }

    onPush() { }

    setupFinishEffect() { }
}