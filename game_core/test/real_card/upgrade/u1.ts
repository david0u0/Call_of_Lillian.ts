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
            let char = this.character_equipped;
            let master_role_chain = this.g_master.getMyMaster(this).get_battle_role_chain;
            this.appendChainWhileAlive(master_role_chain, arg => {
                if (arg.char.isEqual(char)) {
                    return { result_arg: { char, role: BattleRole.Sniper }};
                }
            });
        }
    }
}