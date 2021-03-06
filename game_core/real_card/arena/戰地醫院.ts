import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "戰地醫院";
let description = "使用：承受1情緒，賺取2+X魔力，X為使用角色的戰力。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_exploit_cost = 0;
    series = [ CardSeries.Hospital ];

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        let str = 0;
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
            str = this.g_master.getMyMaster(char).getStrength(char);
        }
        await this.g_master.getMyMaster(char).addEmo(1, caller);
        return 2 + str;
    }
}