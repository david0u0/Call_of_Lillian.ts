import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "事件仲介所";
let description = "使用：1魔力->將一張*尋貓啟事*加入你的結算區，並令使用的角色退場。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_exploit_cost = 1;

    async onExploit(char: ICharacter|Player) {
        let p = TypeGaurd.isCard(char) ? char.owner : char;
        let evt = await this.g_master.genCardToBoard(p, "尋貓啟事");
        if(TypeGaurd.isCard(char)) {
            await this.g_master.getMyMaster(p).retireCard(char);
        }
    }
}