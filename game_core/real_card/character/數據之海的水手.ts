import { Character, Upgrade } from "../../cards";
import { CardType, CardStat, CharStat } from "../../enums";
import { TypeGaurd } from "../../interface";

let name = "數據之海的水手";
let description = `
**超頻下載**：在衝突階段之前，你可以在**數據之海的水手**身上安裝任意多件裝備（支付所有代價）。`;

export default class C4 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 0;

    setupAliveeEffect() {
        // NOTE: 本來在場所中的角色如果要安裝升級卡，會被 p_master.play_card_chain 攔下來
        // 所以要在 p_master.play_card_chain 的尾巴插入新的規則
        this.my_master.card_play_chain.appendCheck((t, card) => {
            if(TypeGaurd.isUpgrade(card)) {
                let u = card;
                if(this.isEqual(u.character_equipped)) {
                    return { var_arg: true };
                }
            }
            return { was_passed: true };
        });
    }
}