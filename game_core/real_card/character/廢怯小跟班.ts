import { Character } from "../../cards";
import { GamePhase, CharStat } from "../../enums";

let name = "廢怯小跟班";
let description = "**練習勇敢！**：你可以花費1魔力，使*廢怯小跟班*的戰力增加2，直到下次行動結束。（不可疊加）";

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_strength = 0;
    basic_battle_role = { can_attack: true, can_block: true };
    
    has_triggered_ability = false;

    _abilities = [{
        description: "練習勇敢：花費1魔力，增加2點戰力。",
        func: async () => {
            this.has_triggered_ability = true;
            await this.my_master.addMana(-1);
        },
        canTrigger: () => {
            if(this.my_master.mana < 1) {
                return false;
            } else if(this.has_triggered_ability) {
                return false;
            }
            return true;
        },
        can_play_phase: [GamePhase.Any],
        instance: true
    }];

    setupAliveEffect() {
        this.g_master.t_master.spend_action_chain.append(() => {
            this.has_triggered_ability = false;
        });
        this.get_strength_chain.append(str => {
            if(this.has_triggered_ability) {
                return { var_arg: str + 2 };
            }
        });
    }
}