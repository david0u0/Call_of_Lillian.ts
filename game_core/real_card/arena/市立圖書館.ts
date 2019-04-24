import { CardType, CardSeries, BattleRole, Player, CardStat } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd as TG, IKnownCard, ICard } from "../../interface";

let name = "市立圖書館";
let description = "使用：3魔力->放逐最多兩張牌，並從牌庫抽出同樣數量的牌。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 3;

    async onExploit(char: ICharacter|Player) {
        let caller: Array<IKnownCard> = [this];
        let player: Player;
        if(TG.isCard(char)) {
            caller.push(char);
            player = char.owner;
        } else {
            player = char;
        }

        let cards_to_discard = new Array<ICard>();
        while(true) {
            let _caller = [...caller, ...cards_to_discard];
            let c = await this.g_master.selecter.cancelUI()
            .selectCardInteractive(player, _caller, {
                guard: TG.isCard,
                stat: CardStat.Hand,
                owner: player
            });
            if(c) {
                let cancel = false;
                for(let [i, card] of cards_to_discard.entries()) {
                    if(card.isEqual(c)) {
                        cards_to_discard = [...cards_to_discard.slice(0, i), ...cards_to_discard.slice(i+1)];
                        cancel = true;
                        break;
                    }
                }
                if(!cancel) {
                    cards_to_discard.push(c);
                    if(cards_to_discard.length == 2) {
                        break;
                    }
                }
            } else {
                break;
            }
        }
        for(let c of cards_to_discard) {
            let known_card = await this.g_master.exposeCard(c);
            await this.g_master.getMyMaster(player).exileCard(known_card);
            await this.g_master.getMyMaster(player).draw();
        }
    }
}