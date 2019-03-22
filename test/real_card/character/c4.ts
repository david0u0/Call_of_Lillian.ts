import { Character, Upgrade } from "../../../cards";
import { CardType } from "../../../enums";

let name = "數據之海的水手";
let description = `
**超頻下載**：在結算戰力之前，你可以在**數據之海的水手**身上安裝任意多件裝備（支付所有代價）。`;

export class C4 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 0;

    initialize() {
        // TODO: 尚未測試!
        this.g_master.getMyMaster(this).card_play_chain.dominantCheck(card => {
            if(card.card_type == CardType.Upgrade) {
                let u = card as Upgrade;
                if(this.isEqual(u.character_equipped)) {
                    return { break_chain: true };
                }                
            }
        });
    }
}