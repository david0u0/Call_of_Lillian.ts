import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { ICharacter, IArena } from "../../interface";

let name = "M市立綜合醫院";
let description = "使用：賺取3點魔力，並承受1情緒。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_exploit_cost = 0;
    series = [ CardSeries.Hospital ];

    onExploit(char: ICharacter|Player) {
        this.g_master.getMyMaster(char).addEmo(1);
        return 2;
    }
}