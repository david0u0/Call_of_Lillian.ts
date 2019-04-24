import { Character } from "../../cards";
import { RuleEnums } from "../../enums";

let name = "工作狂小紅";
let description = "**人生就是不停的戰鬥！**：在收獲階段，本角色可以利用場所兩次。";

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 0;
    basic_battle_role = { can_attack: true, can_block: true, is_melee: true };

    private has_exploited = false;
    setupAliveEffect() {
        this.g_master.t_master.start_exploit_chain.append(() => {
            this.has_exploited = false;
        });
        this.exploit_chain.append(() => {
            if(!this.has_exploited) {
                this.has_exploited = true;
                return { mask_id: RuleEnums.ExitAfterExploit };
            }
        });
    }
}