import { CardSeries, Player } from "../../enums";
import { Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "甜點吃到飽";
let description = `（休閒場所）
使用：3魔力→恢復兩點情緒。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_exploit_cost = 3;
    series = [ CardSeries.Entertainment ];

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        await this.g_master.getMyMaster(char).addEmo(-2, caller);
    }
}