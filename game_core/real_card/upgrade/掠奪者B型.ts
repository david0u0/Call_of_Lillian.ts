import { Upgrade } from "../../cards";
import { ICharacter, TypeGaurd } from "../../interface";
import { BadOperationError } from "../../errors";
import { CardStat } from "../../enums";

let name = "掠奪者B型";
let description = "當裝備者攻擊時，抽一張牌，並放逐一張手牌。";

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_strength = 1;

    setupAliveEffect() {
        let chain = this.g_master.w_master.before_conflict_chain;
        // 接在鏈的開頭，以免被其它效果拆掉
        this.addActionWhileAlive(false, chain, async ({ atk }) => {
            for(let ch of atk) {
                if(ch.isEqual(this.data.character_equipped)) {
                    // 確實是由裝備者發動攻擊
                    await this.my_master.draw();
                    let to_discard = await this.g_master.selecter.promptUI("請選擇捨棄的卡牌")
                    .selectCardInteractive(this.owner, [this], {
                        guard: TypeGaurd.isCard,
                        stat: CardStat.Hand,
                        owner: this.owner,
                        must_have_value: true
                    });
                    let known = await this.g_master.exposeCard(to_discard);
                    await this.my_master.exileCard(known);
                }
            }
        });
    }
}