import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "姆咪姆咪學園";
let description = "使用：2魔力->招募一名*見習魔女*至待命區";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 1;
    basic_exploit_cost = 2;

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        let p = TypeGaurd.isCard(char) ? char.owner : char;
        await this.g_master.genCharToBoard(p, "見習魔女");
    }
}