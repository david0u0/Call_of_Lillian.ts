import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd } from "../../interface";

let name = "彩虹橋下的酒館";
let description = `使用：3魔力->恢復2情緒。
或
使用：3魔力->造成對手1情緒傷害。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_exploit_cost = 3;

    async onExploit(char: ICharacter|Player) {
        let _index = await this.g_master.selecter.selectText(this, ["恢復2情緒", "造成對手1情緒傷害"]);
        let index = 0;
        if(typeof _index == "number") {
            index = _index;
        }
        if(index == 0) {
            await this.g_master.getMyMaster(char).addEmo(-2);
        } else {
            await this.g_master.getEnemyMaster(char).addEmo(1);
        }
    }
}