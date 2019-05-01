import { CardSeries, BattleRole } from "../../enums";
import { Character, Upgrade } from "../../cards";
import { TypeGaurd } from "../../interface";

let name = "零卍佛滅卍實驗體少女";
let description = `**系統最深處的少女**：*零卍佛滅卍實驗體少女*入場時，對手的魔力值減10。
裝備升級卡於本角色無需耗費魔力，每當雙方有角色退場，對手承受3點情緒傷害。
這個角色在場時，所有我方角色的戰力加五。
（角色行動）使對手的一個角色退場。
本角色的基礎特徵為**狙擊**。`;

export default class C_Test0 extends Character {
    name = name;
    description = description;
    deck_count = 0;
    series = [ CardSeries.Testing ];
    basic_mana_cost = 0;
    basic_strength = 10;

    onPlay() {
        // NOTE: 對手魔力減10
        this.enemy_master.addMana(-10);
    }

    setupAliveEffect() {
        let my_master = this.my_master;
        let enemy_master = this.enemy_master;

        // NOTE: 我方戰力加5
        this.addGetterWhileAlive(true, my_master.get_strength_chain, (str, { card }) => {
            if(TypeGaurd.isCharacter(card)) {
                return { var_arg: str + 5 };
            }
        });

        // NOTE: 任一角色退場造成情緒傷害
        this.addActionWhileAlive(true, 
            [my_master.card_retire_chain, enemy_master.card_retire_chain],
            card => {
                if(TypeGaurd.isCharacter(card)) {
                    enemy_master.addEmo(3);
                }
            }
        );

        // NOTE: 裝備免費
        this.addGetterWhileAlive(true, my_master.get_mana_cost_chain, (cost, card) => {
            if(card instanceof Upgrade) {
                if(this.isEqual(card.data.character_equipped)) {
                    return { var_arg: 0 };
                }
            }
        });

        // NOTE: 讓裝備知道自己可以被施放，不會被介面擋掉
        this.addGetterWhileAlive(true, my_master.check_before_play_chain, (t, card) => {
            if(TypeGaurd.isUpgrade) {
                return { var_arg: true };
            }
        });

        // NOTE: 禁止施咒
        this.addCheckWhileAlive(true, enemy_master.card_play_chain, (t, card) => {
            if(TypeGaurd.isSpell(card)) {
                return { var_arg: false };
            }
        });
    }
    // NOTE: 角色行動
    public readonly has_char_action = true;
    charAction() {
        this.enemy_master.addEmo(3);
    }
}