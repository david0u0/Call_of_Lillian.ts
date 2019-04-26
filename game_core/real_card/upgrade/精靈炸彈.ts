import { Upgrade, Character } from "../../cards";
import { BattleRole } from "../../enums";

let name = "精靈炸彈";
let description = "裝備者獲得*狙擊*特性。";

export default class U1 extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 1;

    setupAliveEffect() {
        let role_chain = this.my_master.get_battle_role_chain;
        this.addGetterWhileAlive(true, role_chain, (role, char) => {
            if(char.isEqual(this.character_equipped)) {
                return { var_arg: { ...role, can_not_be_blocked: true } };
            }
        });
    }
}