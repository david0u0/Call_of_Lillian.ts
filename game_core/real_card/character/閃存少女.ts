import { Character, Upgrade } from "../../cards";
import { CardType, CardStat, BattleRole, RuleEnums } from "../../enums";

let name = "閃存少女";
let description = "**垃圾蒐集**：每個世代的收獲階段開始前，放逐*閃存少女*。釋放本角色不會恢復情緒值。";

export default class C extends Character {
    name = name;
    description = description;
    basic_strength = 1;
    basic_mana_cost = 0;

    setupAliveEffect() {
        this.g_master.t_master.start_exploit_chain.append(async () => {
            if(this.card_status != CardStat.Exile) {
                await this.my_master.exileCard(this);
            }
        });
        this.release_chain.append(() => {
            return { mask_id: RuleEnums.RecoverEmoAfterRelease };
        });
    }
}