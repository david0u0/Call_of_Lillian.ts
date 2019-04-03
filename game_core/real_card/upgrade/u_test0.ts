import { Upgrade, Character } from "../../cards";
import { BattleRole } from "../../enums";

let name = "零卍廢到笑卍白板武器";
let description = `
這是一張沒有任何其它效果的升級。廢到笑。`;

export default class U_Test0 extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 1;
    basic_strength = 1;
}