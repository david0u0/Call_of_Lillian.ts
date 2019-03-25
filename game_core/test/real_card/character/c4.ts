import { Character, Upgrade } from "../../../cards";
import { CardType, CardStat } from "../../../enums";
import { throwIfIsBackend } from "../../../game_master";
import { TypeGaurd } from "../../../interface";

let name = "數據之海的水手";
let description = `
**超頻下載**：在衝突階段之前，你可以在**數據之海的水手**身上安裝任意多件裝備（支付所有代價）。`;

export class C4 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 0;

    onPlay() {
        // NOTE: 本來在場所中的角色如果要安裝升級卡，會被 p_master.play_card_chain 攔下來
        // 所以要在 p_master.play_card_chain 的開頭插入新的規則，在被攔下來之前打斷 play_card_chain!
        this.g_master.getMyMaster(this).card_play_chain.dominantCheck(card => {
            if(TypeGaurd.isUpgrade(card)) {
                if (this.isEqual(card.character_equipped)) {
                    // NOTE: 在場與否的檢查會被 break_chain 打斷，所以這邊得要手動檢查
                    if(this.card_status == CardStat.Onboard) {
                        return { break_chain: true };
                    } else {
                        throwIfIsBackend("試圖安裝升級於不在場的角色", this);
                        return { intercept_effect: true };
                    }
                }
            }
            return { was_passed: true };
        });
    }
}