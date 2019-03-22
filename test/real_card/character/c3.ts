import { Character } from "../../../cards";
import { BattleRole, CharStat } from "../../../enums";

let name = "狙擊鏡後的天使";
let description = `
**準星之所向**：*狙擊鏡後的天使*與不同場所的角色戰鬥時，額外擁有3點戰力。
**狙擊**`;

export class C2 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 5;
    readonly basic_strength = 1;
    basic_battle_role = BattleRole.Sniper;

    initialize() {
        this.get_infight_strength_chain.append(arg => {
            if(this.arena_entered) {
                if(this.arena_entered.isEqual(arg.enemy.arena_entered)) {
                    return { result_arg: { ...arg, strength: arg.strength+3 }};
                }
            }
            return { was_passed: true };
        });
    }
}

"指尖的溫柔"