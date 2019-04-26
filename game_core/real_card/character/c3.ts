import { Character } from "../../cards";
import { BattleRole, CharStat } from "../../enums";
import { ConflictEnum } from "../../master/war_master";

let name = "狙擊鏡後的天使";
let description = `狙擊
**準星之所向**：*狙擊鏡後的天使*攻擊不同場所的角色時，額外擁有2點戰力，且不會被擊退。`;

export default class C2 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 5;
    readonly basic_strength = 1;
    basic_battle_role = { can_attack: true, can_block: true, can_be_blocked: false };

    setupAliveEffect() {
        this.get_strength_chain.append((str, enemy) => {
            if(this.data.arena_entered && enemy) {
                if(!this.data.arena_entered.isEqual(enemy.data.arena_entered)) {
                    return { var_arg: str + 2 };
                }
            }
            return { was_passed: true };
        });
        this.repulse_chain.dominant(enemies => {
            if(this.g_master.w_master.getConflictEnum(this) == ConflictEnum.Attacking) {
                if(enemies.length == 1) {
                    let e = enemies[0];
                    if(e.data.arena_entered && !e.data.arena_entered.isEqual(this.data.arena_entered)) {
                        return { intercept_effect: true };
                    }
                }
            }
        });
    }
}

"指尖的道別";