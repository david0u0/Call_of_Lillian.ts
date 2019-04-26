import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "事件仲介所";
let description = "使用：3魔力->將一張*尋貓啟事*加入你的結算區。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 3;

    async onExploit(char: ICharacter|Player) {
        let p = TypeGaurd.isCard(char) ? char.owner : char;
        await this.g_master.genEventToBoard(p, "尋貓啟事", true);
    }
}