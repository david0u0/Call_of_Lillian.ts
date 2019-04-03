import { Upgrade, Character } from "../../cards";
import { BattleRole } from "../../enums";

let name = "精靈炸彈";
let description = "裝備者獲得*狙擊*特性。";

export default class U1 extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 1 ;
    basic_strength = 2;

    onPlay() {
        if(this.character_equipped) {
            let role_chain = this.character_equipped.get_battle_role_chain;
            this.addGetterWhileAlive(true, role_chain, (role) => {
                return { var_arg: { ...role, can_be_blocked: false }};
            });
        }
    }
}