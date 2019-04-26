import { Upgrade } from "../../cards";
import { BattleRole, CardType, CharStat } from "../../enums";
import { TypeGaurd, ICharacter } from "../../interface";

let name = "和平天使";
let description = `陷阱
在衝突發生之前，擊退所有參與戰爭的角色，並銷毀本升級。`;

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 5;
    basic_strength = 0;

    setupAliveEffect() {
        this.addActionWhileAlive(true, this.g_master.w_master.before_conflict_chain, (arg) => {
            if(arg.def.isEqual(this) && arg.is_target) {
                this.g_master.getAll(TypeGaurd.isCharacter, c => {
                    return c.char_status == CharStat.InWar;
                }).forEach(char => {
                    this.g_master.w_master.repulseChar(char);
                });
                this.my_master.retireCard(this);
                return { intercept_effect: true };
            }
        });
    }
    
}
