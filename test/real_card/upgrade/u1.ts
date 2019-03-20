import { Upgrade, Character } from "../../../cards";
import { BattleRole } from "../../../enums";

let name = "精靈炸彈";
let description = `
裝備者獲得*狙擊*特性。`;

export class U1 extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 1 ;
    basic_strength = 2;

    applyEffect(char: Character) {
        this.dominantChainWhileAlive(char.get_battle_role_chain, role => {
            return { result_arg: BattleRole.Sniper, break_chain: true };
        });
    }
}