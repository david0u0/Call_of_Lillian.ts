import { Character } from "../../cards";
import { CharStat } from "../../enums";
import { buildConfig, TypeGaurd } from "../../interface";

let name = "飛行隊的秘密武器";
let description = "**空襲警報**：此角色參與的戰鬥結束時，你可以將其轉移至其它場所。";

export default class C extends Character {
    name = name;
    description = description;
    basic_strength = 0;
    basic_mana_cost = 3;
    instance = true;

    setupAliveEffect() {
        this.addActionWhileAlive(this.g_master.w_master.end_war_chain, async () => {
            if(this.char_status == CharStat.InWar) {
                let arena = await this.g_master.selecter.cancelUI().promptUI("選擇轉移的場所")
                .selectCardInteractive(this.owner, this, buildConfig({
                    guard: TypeGaurd.isArena
                }));
                if(arena) {
                    this.my_master.enterArena(arena, this, false, []);
                }
            }
        });
    }
}