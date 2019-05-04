import { CardSeries, Player } from "../../enums";
import { Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "校園偶像事務所";
let description = `使用：2魔力→召募一名*見習魔女*至待命區。
或
使用：賺取3魔力，並承受1情緒。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    series = [ CardSeries.Entertainment ];

    constructor() { }

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
        }
        await this.g_master.getMyMaster(char).addEmo(-2, caller);
    }
}