import { Character } from "../../cards";
import { CharStat, RuleEnums } from "../../enums";
import { buildConfig, TypeGaurd } from "../../interface";

let name = "飛行隊的秘密武器";
let description = "**空襲警報**：當你宣戰時，若本角色不在戰場且尚未疲勞，你可以支付一魔力，將其轉移至戰場。";

export default class C extends Character {
    name = name;
    description = description;
    basic_strength = 3;
    basic_mana_cost = 6;

    setupAliveEffect() {
        let wm = this.g_master.w_master;
        this.addActionWhileAlive(wm.declare_war_chain, async () => {
            return {
                after_effect: async () => {
                    if(wm.atk_player == this.owner && this.my_master.mana >= 1
                        && !this.is_tired && this.char_status != CharStat.InWar
                    ) {
                        while(true) {
                            // TODO: 存下目前的遊戲狀態?
                            let arena = await this.g_master.selecter.cancelUI().promptUI("選擇轉移的場所")
                            .selectCardInteractive(this.owner, this, buildConfig({
                                guard: TypeGaurd.isArena,
                                check: card => {
                                    let fields = wm.getAllWarFields();
                                    let res = fields.find(f => card.isEqual(f));
                                    return res ? true : false;
                                }
                            }));
                            if(arena) {
                                await this.my_master.addMana(-1);
                                if(this.data.arena_entered) {
                                    await this.my_master.exitArena(this);
                                }
                                let res = await this.my_master.enterArena(arena, this, false,
                                    [RuleEnums.CheckTiredWhenEnter, RuleEnums.CheckPhaseWhenEnter]);
                                if(res) {
                                    await this.my_master.changeCharTired(this, false);
                                    this.char_status = CharStat.InWar;
                                    break;
                                } else {
                                    // TODO: 恢復上一個遊戲狀態?
                                }
                            } else {
                                break;
                            }
                        }
                    }
                }
            };
        });
    }
}