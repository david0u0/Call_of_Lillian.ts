import { Character } from "../../cards";
import { BattleRole } from "../../enums";
import { ICharacter } from "../../interface";

let name = "終末之民";
let description = "**輻射吐息**：即使*終末之民*的戰力為0仍可攻擊與格擋。每當本角色被擊退，對手損失1魔力。";

export default class C extends Character implements ICharacter {
    name = name;
    description = description;
    basic_mana_cost = 0;
    public readonly basic_battle_role = { can_attack: false, can_block: true };
    public readonly basic_strength = 0;

    setupAliveeEffect() {
        let master_role_chain = this.my_master.get_battle_role_chain;
        this.addGetterWhileAlive(true, master_role_chain, (role, char) => {
            if(char.isEqual(this)) {
                return { var_arg: { ...role, can_attack: true, can_block: true }};
            }
        });
        this.attack_chain.append(enemy => {
            this.enemy_master.addMana(-1, [this]);
        });
    }
}