import { Upgrade, Character } from "../../../cards";
import { BattleRole, Player } from "../../../enums";
import { GameMaster } from "../../../game_master";
import { TypeGaurd } from "../../../interface";

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
        pm.get_strength_chain.append((str, char) => {
            if(char.isEqual(this.character_equipped)) {
                return { var_arg: str + this.modifier };
            }
        });
        this.g_master.season_end_chain.append(() => {
            this.modifier += 2;
        });
        this.card_retire_chain.append(() => {
            let new_char = this.g_master.selecter.selectSingleCardInteractive(TypeGaurd.isCharacter, char => {
                return char.owner == this.owner;
            });
            if(new_char) {
                // 把自己附到別人身上，然後打斷這條退場鏈
                this.character_equipped = new_char;
                new_char.addUpgrade(this);
                return {
                    intercept_effect: t => { }
                };
            }
        });
    }
}