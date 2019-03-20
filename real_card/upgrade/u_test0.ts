import { Upgrade, Character } from "../../cards";
import { BattleRole } from "../../enums";

let name = "零卍廢到笑卍白板武器";
let description = `
這是一張沒有任何效果的升級。
`;

export class U_Test0 extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_strength = 1;
}