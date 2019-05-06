import { CardType, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "事件仲介所";
let description = "使用：將一張*尋貓啟事*加入你的結算區，並令使用的角色退場。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_exploit_cost = 0;

    async onExploit(char: ICharacter|Player) {
        let [p, caller] = this.getPlayerAndCaller(char);
        if(TypeGaurd.isCard(char)) {
            await this.g_master.getMyMaster(p).retireCard(char);
        }
    }
}