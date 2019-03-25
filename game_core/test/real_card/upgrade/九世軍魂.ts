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
            // 創造一個新的這件裝備，將它附到別人身上，然後把自己放逐掉。
            let constructor = (seq: number, owner: Player, gm: GameMaster) => {
                return new U(seq, owner, gm);
            }
            let new_chars = this.g_master.selecter.selectChars(1, 0, char => {
                return char.owner == this.owner;
            });
            if(new_chars.length == 1) {
                let relive = this.g_master.genCardToHand(this.owner, constructor) as U;
                relive.modifier = this.modifier;
                this.g_master.getMyMaster(this)
                relive.character_equipped = new_chars[0];
                pm.playCard(relive, false);
                pm.exileCard(this);
                return { intercept_effect: true };
            }
        });
    }
}