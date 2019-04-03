import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter } from "../../interface";

let name = "M市立高級中學";
let description = "2魔力 -> 招募一名*見習魔女*至待命區";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_exploit_cost = 0;

    onExploit(char: ICharacter|Player) {

    }
}