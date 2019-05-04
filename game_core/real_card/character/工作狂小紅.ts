import { Character } from "../../cards";
import { RuleEnums } from "../../enums";

let name = "工作狂小紅";
let description = "**人生就是不停的戰鬥！**：在收獲階段，本角色可以利用場所兩次，並承受1點情緒。";

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 0;
    basic_battle_role = { can_attack: true, can_block: true, is_melee: true };

    public readonly data = {
        arena_entered: null,
        has_exploited: false
    }

    setupAliveEffect() {
        this.g_master.t_master.start_exploit_chain.append(() => {
            this.data.has_exploited = false;
        });
        this.exploit_chain.append(async () => {
            if(!this.data.has_exploited) {
                this.data.has_exploited = true;
                return { mask_id: RuleEnums.ExitAfterExploit };
            } else {
                await this.my_master.addEmo(1);
            }
        });
    }
}