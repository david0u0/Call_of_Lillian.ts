import { Character } from "../../cards";
import { ICharacter } from "../../interface";

let name = "終末之民";
let description = "**輻射吐息**：即使*終末之民*的戰力為0仍可攻擊與格擋。每當本角色被擊退，對手損失1魔力。";

export default class C extends Character implements ICharacter {
    name = name;
    description = description;
    deck_count = 0;
    basic_mana_cost = 0;
    public readonly basic_battle_role = { can_attack: true, can_block: true };
    public readonly basic_strength = 0;

    setupAliveEffect() {
        let master_role_chain = this.my_master.get_battle_role_chain;
        // TODO: 這裡應該用 mask_id 的方法把0戰力角色的相關規則屏蔽掉
        this.addGetterWhileAlive(true, master_role_chain, (role, char) => {
            if(char.isEqual(this)) {
                return { var_arg: { ...role, can_attack: true, can_block: true }};
            }
        });
        this.repulse_chain.append(() => {
            this.enemy_master.addMana(-1, [this]);
        });
    }
}