import { Upgrade, Character } from "../../../cards";
import { BattleRole, Player } from "../../../enums";
import { GameMaster } from "../../../game_master";

let name = "九世軍魂";
let description = `每一季結束時，*九世軍魂*的戰力+2。當本裝備被銷毀時，可以改為將其裝備至任意角色。
裝備者獲得角色行動：銷毀*九世軍魂*。`;

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_strength = -3;

    protected modifier = 0;

    onPlay() {
        let pm = this.g_master.getMyMaster(this);
        pm.get_strength_chain.append(arg => {
            if(arg.char.isEqual(this.character_equipped)) {
                let result_arg = {
                    char: arg.char,
                    strength: arg.strength + this.modifier
                }
                return { result_arg };
            }
        });
        this.g_master.season_end_chain.append(() => {
            this.modifier += 2;
        });
        this.card_retire_chain.append(() => {
            let new_char = this.g_master.selecter.selectCharsInteractive(1, 0, char => {
                return char.owner == this.owner;
            }, true)[0];
            if(new_char) {
                // 把自己附到別人身上，然後打斷這條退場鏈
                this.character_equipped = new_char;
                new_char.addUpgrade(this);
            }
        });
    }
}