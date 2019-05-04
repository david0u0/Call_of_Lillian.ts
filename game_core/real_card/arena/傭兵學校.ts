import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "傭兵學校";
let description = "使用：3魔力->招募一名*遊擊隊員*至待命區";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 3;

    series = [CardSeries.School];

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        let p = TypeGaurd.isCard(char) ? char.owner : char;
        await this.g_master.genCardToBoard(p, "游擊隊員");
    }
}