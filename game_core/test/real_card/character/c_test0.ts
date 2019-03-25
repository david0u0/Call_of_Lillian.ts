import { CardSeries, BattleRole } from "../../../enums";
import { Character, Upgrade } from "../../../cards";
import { TypeGaurd } from "../../../interface";

let name = "零卍佛滅卍實驗體少女";
let description = `
**系統最深處的少女**：*零卍佛滅卍實驗體少女*入場時，對手的魔力值減10。
裝備升級卡於本角色無需耗費魔力，每當雙方有角色退場，對手承受3點情緒傷害。
這個角色在場時，所有我方角色的戰力加五。
（角色行動）使對手的一個角色退場。
本角色的基礎特徵為**狙擊**。`;

export class C_Test0 extends Character {
    name = name;
    description = description;
    series = [ CardSeries.Testing ];
    basic_mana_cost = 1;
    basic_strength = 10;
    public readonly basic_battle_role = BattleRole.Sniper;

    onPlay() {
        let my_master = this.g_master.getMyMaster(this);
        let enemy_master = this.g_master.getEnemyMaster(this);
        // NOTE: 對手魔力減10
        enemy_master.setMana(enemy_master.mana - 10);

        // NOTE: 我方戰力加5
        this.appendChainWhileAlive(my_master.get_strength_chain, (str, char) => {
            return { var_arg: str + 5};
        });

        // NOTE: 任一角色退場造成情緒傷害
        this.appendChainWhileAlive(
            [my_master.card_retire_chain, enemy_master.card_retire_chain],
            (t, card) => {
                if(TypeGaurd.isCharacter(card)) {
                    enemy_master.setEmo(enemy_master.emo + 3);
                }
            }
        );

        // NOTE: 裝備免費
        this.appendChainWhileAlive(my_master.get_mana_cost_chain, (cost, card) => {
            if (card instanceof Upgrade) {
                if (this.isEqual(card.character_equipped)) {
                    return { var_arg: 0 };
                }
            }
        });

        // NOTE: 禁止施咒
        this.dominantCheckWhileAlive(enemy_master.card_play_chain, card => {
            if(TypeGaurd.isSpell(card)) {
                return { intercept_effect: true };
            }
        });
    }
    // NOTE: 角色行動
    public readonly has_char_action = true;
    charAction() {
        let enemy_master = this.g_master.getEnemyMaster(this);
        enemy_master.setEmo(enemy_master.emo + 3);
    }
}