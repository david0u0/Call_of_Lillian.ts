import { Character, Upgrade } from "../../../cards";
import { CardType, CardStat, CharStat } from "../../../enums";
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
        this.g_master.getMyMaster(this).card_play_chain.dominantCheck((t, card) => {
            if(TypeGaurd.isUpgrade(card)) {
                let u = card;
                if (this.isEqual(u.character_equipped)) {
                    // NOTE: 整個檢查都會被 break_chain 打斷，所以這邊得要手動檢查

                    if (card.character_equipped) {
                        if (card.character_equipped.card_status != CardStat.Onboard) {
                            throwIfIsBackend("指定的角色不在場上", card);
                            return { var_arg: false };
                        } else if (card.character_equipped.char_status != CharStat.StandBy) {
                            // throwIfIsBackend("指定的角色不在待命區", card);
                            // return { var_arg: false };
                            return { break_chain: true };
                        } else if (card.character_equipped.owner != card.owner) {
                            throwIfIsBackend("指定的角色不屬於你", card);
                            return { var_arg: false };
                        }
                    } else {
                        throwIfIsBackend("未指定角色就打出升級", card);
                        return { var_arg: false };
                    }
                }
            }
            return { was_passed: true };
        });
    }
}