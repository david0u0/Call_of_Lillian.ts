import { CardType, CardSeries, BattleRole, Player } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "傭兵學校";
let description = `本場所僅能容納一個角色。
使用：4魔力->招募一名*遊擊隊員*至待命區`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    max_capacity = 1;
    basic_mana_cost = 4;
    basic_exploit_cost = 4;

    onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        let p = TypeGaurd.isCard(char) ? char.owner : char;
        this.g_master.genCharToBoard(p, "遊擊隊員");
    }
}