import { Upgrade, Character } from "../../../cards";
import { BattleRole } from "../../../enums";

let name = "精靈炸彈";
let description = `裝備者獲得*狙擊*特性。`;

export class U1 extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 1 ;
    basic_strength = 2;

    onPlay() {
        if(this.character_equipped) {
            let master_role_chain = this.my_master.get_battle_role_chain;
            this.appendChainWhileAlive(master_role_chain, (role, char) => {
                if (char.isEqual(this.character_equipped)) {
                    if(role == BattleRole.Attacker) {
                        return { var_arg: BattleRole.Sniper_Attacker };
                    } else if(role != BattleRole.Civilian && role != BattleRole.Defender) {
                        return { var_arg: BattleRole.Sniper };
                    }
                }
            });
        }
    }
}