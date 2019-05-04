import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd as TG } from "../../interface";

let name = "「永遠是朋友了」";
let description = `超凡1（分數為1或以上才可出牌）
結算：使雙方魔力均分（向下取整）。`;

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
        let new_mana = Math.floor((this.my_master.mana + this.enemy_master.mana) / 2);
        this.my_master.addMana(-this.my_master.mana + new_mana, [this]);
        this.my_master.addMana(-this.enemy_master.mana + new_mana, [this]);
    }

    onPush() { }

    setupFinishEffect() { }
}