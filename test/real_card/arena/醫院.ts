import { CardType, CardSeries, BattleRole } from "../../../enums";
import { Character, Upgrade, Arena } from "../../../cards";

let name = "意識下載界面";
let description = `1情緒 -> 賺取3點魔力`;

export default class A extends Arena {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_exploit_cost = 0;

    onExploit(char: Character) {
        let ch_master = this.g_master.getMyMaster(char) ;
        ch_master.setEmo(ch_master.emo + 1);
        return 2;
    }
}