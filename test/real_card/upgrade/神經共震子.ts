import { Upgrade, Character } from "../../../cards";
import { BattleRole } from "../../../enums";

let name = "神經共震子";
let description = `陷阱
在衝突階段之前，指定一個進攻者並擊退之，同時銷毀*神經共震子*`;

/**
 * 陷阱：若裝備者被指定為攻擊對象，且沒有其它角色進行格擋，才可發動效果。
 */

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_strength = 0;

    onPlay() {
    }
}