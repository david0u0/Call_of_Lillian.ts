import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "彩虹橋下的酒館";
let description = `（休閒場所）
使用：3魔力->恢復2情緒。
或
使用：3魔力->造成對手1情緒傷害。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 3;
    series = [ CardSeries.Entertainment ];

    // TODO: 功能的選擇應該放在 before exploit chain

    async onExploit(char: ICharacter|Player) {
        let caller: IKnownCard[] = [this];
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        let player = TypeGaurd.isCard(char) ? char.owner : char;
        let _index = await this.g_master.selecter.selectText(player, this, ["恢復2情緒", "造成對手1情緒傷害"]);
        let index = 0;
        if(typeof _index == "number") {
            index = _index;
        }
        if(index == 0) {
            await this.g_master.getMyMaster(char).addEmo(-2, caller);
        } else {
            await this.g_master.getEnemyMaster(char).addEmo(1, caller);
        }
    }
}