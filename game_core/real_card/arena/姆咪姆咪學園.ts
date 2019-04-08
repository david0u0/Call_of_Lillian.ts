import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "姆咪姆咪學園";
let description = `本場所僅能容納一個角色。
使用：3魔力->招募一名*見習魔女*至待命區`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    max_capacity = 1;
    basic_mana_cost = 1;
    basic_exploit_cost = 3;

    onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        let p = TypeGaurd.isCard(char) ? char.owner : char;
        this.g_master.genCharToBoard(p, "見習魔女");
    }
}