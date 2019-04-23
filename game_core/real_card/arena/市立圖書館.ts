import { CardType, CardSeries, BattleRole, Player, CardStat } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard, ICard } from "../../interface";

let name = "市立圖書館";
let description = "使用：3魔力->放逐最多三張牌，並從牌庫抽出同樣數量的牌。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 3;

    async onExploit(char: ICharacter|Player) {
        let caller = new Array<IKnownCard>();
        let player: Player;
        if(TypeGaurd.isCard(char)) {
            caller.push(char);
            player = char.owner;
        } else {
            player = char;
        }

        let cards = new Array<ICard>();
        while(true) {
            this.g_master.selecter.freeze();
            let c = await this.g_master.selecter.cancelUI()
            .selectCardInteractive(player, caller, TypeGaurd.isCard, c => {
                return (c.card_status == CardStat.Hand && c.owner == player);
            });
            if(c) {
                let cancel = false;
                for(let [i, card] of cards.entries()) {
                    if(card.isEqual(c)) {
                        cards = [...cards.slice(0, i), ...cards.slice(i+1)];
                        cancel = true;
                        break;
                    }
                }
                if(!cancel) {
                    cards.push(c);
                    if(cards.length == 3) {
                        break;
                    }
                }
            } else {
                break;
            }
        }
        this.g_master.selecter.freeze(false);
        for(let c of cards) {
            let known_card = await this.g_master.exposeCard(c);
            await this.g_master.getMyMaster(player).exileCard(known_card);
            await this.g_master.getMyMaster(player).draw();
        }
    }
}