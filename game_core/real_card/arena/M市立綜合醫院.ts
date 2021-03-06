import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { ICharacter, IArena, TypeGaurd, IKnownCard } from "../../interface";

let name = "M市立綜合醫院";
let description = "使用：賺取2點魔力，並承受1情緒。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    deck_count = 0;
    basic_mana_cost = 0;
    basic_exploit_cost = 0;
    series = [ CardSeries.Hospital ];

    async onExploit(char: ICharacter|Player) {
        let [p, caller] = this.getPlayerAndCaller(char);
        await this.g_master.getMyMaster(char).addEmo(1, caller);
        return 2;
    }
}