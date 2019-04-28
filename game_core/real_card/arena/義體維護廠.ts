import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "義體維護廠";
let description = `本場所可容納3個角色。
使用：賺取3魔力，並承受1情緒。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 0;
    max_capacity = 3;
    series = [ CardSeries.Hospital ];

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        await this.g_master.getMyMaster(char).addEmo(1, caller);
        return 3;
    }
}