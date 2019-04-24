import { Upgrade, Character } from "../../cards";
import { BattleRole, Player, CharStat, GamePhase, CardStat } from "../../enums";
import { TypeGaurd } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "九世軍魂";
let description = `每世代開始時戰力增加1。當本裝備即將被銷毀，可以改為將其裝備至任意角色，並使戰力增加1。
裝備者獲得角色行動：銷毀*九世軍魂*。`;

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_strength = -4;

    protected modifier = 0;

    _abilities = [{
        description: "銷毀九世軍魂",
        func: async () => {
            let char = this.character_equipped;
            if(char) {
                await this.my_master.retireCard(this);
                await this.my_master.changeCharTired(char, true);
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
        can_play_phase: [GamePhase.InAction, GamePhase.Building, GamePhase.Exploit, GamePhase.InWar]
    }];

    setupAliveEffect() {
        this.get_strength_chain.append(str => {
            return { var_arg: str + this.modifier };
        });
        this.addActionWhileAlive(true, this.g_master.t_master.start_building_chain, () => {
            this.modifier += 1;
        });
        this.card_retire_chain.append(async () => {
            if(this.character_equipped) {
                let new_char = await this.g_master.selecter
                .cancelUI("銷毀裝備")
                .selectCardInteractive(this.owner, this, TypeGaurd.isCharacter, char => {
                    return char.owner == this.owner && char.card_status == CardStat.Onboard;
                });
                if(new_char) {
                    // 把自己附到別人身上，然後打斷這條退場鏈
                    this.modifier += 1;
                    this.character_equipped.unsetUpgrade(this);
                    this.character_equipped = new_char;
                    this.my_master.dangerouslySetToBoard(this);
                    return { intercept_effect: true };
                }
            }
        });
    }
}