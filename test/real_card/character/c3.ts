import { Character } from "../../../cards";
import { BattleRole, CharStat } from "../../../enums";

let name = "狙擊鏡後的天使";
let description = `
**準星之所向**：當*狙擊鏡後的天使*攻擊時，額外擁有3點戰力。
**狙擊**`;

export class C2 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 5;
    readonly basic_strength = 1;
    basic_battle_role = BattleRole.Sniper;

    initialize() {
        this.get_strength_chain.append(strength => {
            if(this.char_status == CharStat.Attacking) {
                return { result_arg: strength + 3 };
            } else {
                return { was_passed: true };
            }
        });
    }
}

"指尖的溫柔"