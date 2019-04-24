import { Upgrade, Character } from "../../cards";

let name = "大衛化";
let description = "當大衛化的角色承受情緒傷害時，令對手承受一點情緒。";

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 5;
    basic_strength = 1;

    setupAliveEffect() {
        this.addActionWhileAlive(true, this.my_master.set_emo_chain, async ({ emo, caller }) => {
            let cur_emo = this.my_master.emo;
            if(emo > cur_emo) {
                // 代表是承受傷害不是治癒
                for(let card of caller) {
                    if(card.isEqual(this.character_equipped)) {
                        // 代表真的是由裝備者承受傷害
                        await this.enemy_master.addEmo(1);
                    }
                }
            }
        });
    }
}