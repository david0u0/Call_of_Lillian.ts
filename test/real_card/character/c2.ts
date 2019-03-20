import { Character } from "../../../cards";
import { BattleRole } from "../../../enums";

let name = "終末之民";
let description = `
**輻射吐息**：即使*終末之民*的戰力為0仍可攻擊與格擋。每當本角色發動攻擊，對手損失1魔力。`;

export class C2 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 0;
    readonly basic_strength = 0;

    initialize() {
        this.get_battle_role_chain.dominant(role => {
            return { break_chain: true, result_arg: BattleRole.Fighter };
        });
        this.attack_chain.dominant(enemy => {
            let enemy_master = this.g_master.getEnemyMaster(this);
            enemy_master.setMana(enemy_master.mana - 1);
        });
    }
}