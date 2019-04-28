import { Character } from "../../cards";
import { BattleRole, CharStat } from "../../enums";
import { ConflictEnum } from "../../master/war_master";
import { BadOperationError } from "../../errors";

let name = "狙擊鏡後的天使";
let description = `狙擊，超凡2（分數為2或以上才可打出）。
**指尖的道別**：*狙擊鏡後的天使*攻擊不同場所的角色時，額外擁有2點戰力，且不會被擊退。`;

export default class C2 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    readonly basic_strength = 1;
    basic_battle_role = { can_attack: true, can_block: true, can_be_blocked: false };

    check_before_play_chain = this.beyond(2);

    setupAliveEffect() {
        this.get_strength_chain.append((str, enemy) => {
            if(this.data.arena_entered && enemy) {
                if(!this.data.arena_entered.isEqual(enemy.data.arena_entered)) {
                    return { var_arg: str + 2 };
                }
            }
            return { was_passed: true };
        });
        this.g_master.w_master.repulse_chain.dominant(({ loser, winner }) => {
            if(this.g_master.w_master.atk_player && loser.isEqual(this)) {
                if(winner.length == 1) {
                    let enemy = winner[0];
                    if(enemy.data.arena_entered 
                        && !(enemy.data.arena_entered.isEqual(this.data.arena_entered))
                    ) {
                        return { intercept_effect: true };
                    }
                }
            }
        });
    }
}