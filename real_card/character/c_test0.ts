import { CardType, CardSeries, BattleRole } from "../../enums";
import { Character } from "../../cards";

let name = "零卍佛滅卍實驗體少女";
let description = `
**系統最深處的少女**：*零卍佛滅卍實驗體少女*入場時，對手的魔力值歸零。裝備升級卡於本角色無需耗費魔力，每當雙方有角色退場，對手承受3點情緒傷害。
（角色行動）使對手的一個角色退場。
本角色的基礎特徵為**狙擊**
`;

export class C_Test0 extends Character {
    name = name;
    description = description;
    series = [ CardSeries.Testing ];
    basic_mana_cost = 0;
    basic_strength = 10;
    public readonly basic_battle_role = BattleRole.Sniper;

    initialize() {
        this.card_play_chain.append(() => {
            let my_master = this.g_master.getMyMaster(this);
            let enemy_master = this.g_master.getEnemyMaster(this);
            enemy_master.setMana(0);

            this.appendChainWhileAlive(
                [my_master.card_retire_chain, enemy_master.card_retire_chain],
                card => {
                    if (card.card_type == CardType.Character) {
                        enemy_master.setEmo(enemy_master.emo + 3);
                    }
                }
            );
            this.dominantChainWhileAlive(my_master.get_equip_mana_cost_chain, (arg) => {
                if(this.isEqual(arg.char)) { // 裝備的對象確實是這個角色
                    arg = { ...arg, cost: 0 };
                }
                return { result_arg: arg };
            });

            this.dominantChainWhileAlive(enemy_master.card_play_chain, card => {
                if(card.card_type == CardType.Spell) {
                    return { intercept_effect: true };
                }
            });
        });
    }
    // TODO: 增加角色行動
}