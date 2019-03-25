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

    onPlay() {
        this.get_inconflict_strength_chain.append((str, enemy) => {
            if(this.arena_entered) {
                if(!this.arena_entered.isEqual(enemy.arena_entered)) {
                    return { var_arg: str + 3 };
                }
            }
            return { was_passed: true };
        });
    }
}

"指尖的道別"