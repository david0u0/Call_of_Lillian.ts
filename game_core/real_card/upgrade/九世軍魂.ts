import { Upgrade, Character } from "../../cards";
import { BattleRole, Player, CharStat, GamePhase, CardStat } from "../../enums";
import { TypeGaurd as TG, ICharacter } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "九世軍魂";
let description = `每世代開始時戰力增加1。當本裝備即將被銷毀，可以改為將其裝備至任意角色，並使戰力增加1。
裝備者獲得瞬間行動：銷毀*九世軍魂*。`;

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 2;
    basic_strength = -3;

    readonly data: {
        character_equipped: ICharacter | null,
        modifier: number
    } = {
        character_equipped: null,
        modifier: 0
    };

    _abilities = [{
        description: "銷毀九世軍魂",
        func: async () => {
            let char = this.data.character_equipped;
            if(char) {
                await this.my_master.retireCard(this);
                await this.my_master.changeCharTired(char, true);
            } else {
                throw new BadOperationError("沒有裝備者卻想啟動裝備能力", this);
            }
        },
        canTrigger: () => {
            if(this.data.character_equipped) {
                let char = this.data.character_equipped;
                return !char.is_tired && char.char_status == CharStat.StandBy;
            } else {
                return false;
            }
        },
        can_play_phase: [GamePhase.Any],
        instance: true
    }];

    setupAliveEffect() {
        this.get_strength_chain.append(str => {
            return { var_arg: str + this.data.modifier };
        });
        this.addActionWhileAlive(true, this.g_master.t_master.start_building_chain, () => {
            this.data.modifier += 1;
        });
        this.card_retire_chain.append(async () => {
            if(this.data.character_equipped) {
                let new_char = await this.g_master.selecter
                .cancelUI("銷毀裝備")
                .selectCardInteractive(this.owner, this, {
                    guard: TG.isCharacter,
                    owner: this.owner,
                });
                if(new_char) {
                    // 把自己附到別人身上，然後打斷這條退場鏈
                    this.data.modifier += 1;
                    this.data.character_equipped.unsetUpgrade(this);
                    this.data.character_equipped = new_char;
                    this.my_master.dangerouslySetToBoard(this);
                    return { intercept_effect: true };
                }
            }
        });
    }
}