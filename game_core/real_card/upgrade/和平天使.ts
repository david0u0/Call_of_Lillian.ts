import { Upgrade, Character } from "../../cards";
import { BattleRole, CardType, CharStat } from "../../enums";
import { TypeGaurd } from "../../interface";

let name = "和平天使";
let description = `陷阱
在衝突發生之前，擊退所有參與戰爭的角色。`;

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 5;
    basic_strength = 0;

    onPlay() {
        this.addActionWhileAlive(true, this.g_master.conflict_chain, (arg) => {
            if(arg.def.isEqual(this) && !arg.is_blocked) {
                this.g_master.getAll(TypeGaurd.isCharacter, c => {
                    return c.char_status == CharStat.InBattle;
                }).forEach(char => {
                    this.g_master.repulse(char, null);
                });
                return { intercept_effect: true };
            } else {
                return { was_passed: true };
            }
        });
    }
    
}
