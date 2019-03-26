import { CardType, CardSeries, BattleRole } from "../../../enums";
import { Character, Upgrade, Arena } from "../../../cards";
import { ICharacter } from "../../../interface";

let name = "醫院";
let description = `1情緒 -> 賺取3點魔力`;

export default class A extends Arena {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_exploit_cost = 0;

    onExploit(char: ICharacter) {
        this.g_master.getMyMaster(char).addEmo(1);
        return 2;
    }
}