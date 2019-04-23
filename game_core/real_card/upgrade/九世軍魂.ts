import { Upgrade, Character } from "../../cards";
import { BattleRole, Player, CharStat, GamePhase } from "../../enums";
import { TypeGaurd } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "九世軍魂";
let description = `當本裝備被銷毀時，可以改為將其裝備至任意角色，並使本裝備戰力+2。
裝備者獲得角色行動：銷毀*九世軍魂*。`;

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_strength = -3;

    protected modifier = 0;

    _abilities = [{
        description: "銷毀九世軍魂",
        func: () => {
            if(this.character_equipped) {
                this.my_master.changeCharTired(this.character_equipped, true);
                this.my_master.retireCard(this);
            } else {
                throw new BadOperationError("沒有裝備者卻想啟動裝備能力", this);
            }
        },
        canTrigger: () => {
            if(this.character_equipped) {
                let char = this.character_equipped;
                return !char.is_tired && char.char_status == CharStat.StandBy;
            } else {
                return false;
            }
        },
        can_play_phase: [GamePhase.InAction, GamePhase.Building, GamePhase.Exploit]
    }];

    setupAliveeEffect() {
        this.get_strength_chain.append(str => {
            return { var_arg: str + this.modifier };
        });
        this.card_retire_chain.append(async () => {
            if(this.character_equipped) {
                let new_char = await this.g_master.selecter
                .cancelUI("銷毀裝備")
                .selectCardInteractive(this.owner, this, TypeGaurd.isCharacter, char => {
                    return char.owner == this.owner;
                });
                if(new_char) {
                    this.modifier += 2;
                    // 把自己附到別人身上，然後打斷這條退場鏈
                    this.character_equipped.unsetUpgrade(this);
                    this.character_equipped = new_char;
                    this.my_master.dangerouslySetToBoard(this);
                    return { intercept_effect: true };
                }
            }
        });
    }
}