import { CardType, CardSeries, BattleRole, Player, CardStat } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd as TG, IKnownCard, ICard } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "市立圖書館";
let description = "使用：2魔力->抽兩張牌，接著放逐一張手牌。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_exploit_cost = 1;

    async onExploit(char: ICharacter|Player) {
        let [player, caller] = this.getPlayerAndCaller(char);
        if(TG.isCard(char)) {
            caller.push(char);
            player = char.owner;
        } else {
            player = char;
        }
        await this.g_master.getMyMaster(char).draw();
        await this.g_master.getMyMaster(char).draw();

        let card = await this.g_master.selecter
        .selectCardInteractive(player, caller, {
            guard: TG.isKnown,
            stat: CardStat.Hand,
            owner: player,
            must_have_value: true,
        });
        if(card) {
            let _card = await this.g_master.exposeCard(card);
            await this.g_master.getMyMaster(char).exileCard(_card);
        }
    }
}