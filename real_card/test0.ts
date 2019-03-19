import { CardType } from "../enums";
import { Character, Card } from "../cards";

let name = "零卍佛滅卍實驗體少女";
let description = `
(系統最深處的少女) _零卍佛滅卍實驗體少女_入場時，對手的魔力值歸零。裝備升級卡於本角色無需耗費魔力，每當雙方有角色退場，對手承受3點情緒傷害。
`;

// TODO: 裝備0費還無法達成

class Test0 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_strength = 0;

    initialize() {
        this.card_play_chain.append(() => {
            let my_master = this.g_master.getMyMaster(this.owner);
            let enemy_master = this.g_master.getEnemyMaster(this.owner);
            enemy_master.setMana(0);

            this.appendChainWhileAlive(my_master.card_die_chain, (card) => {
                if(card.card_type == CardType.Character) {
                    enemy_master.setEmo(enemy_master.emo + 3);
                }
            });
            this.appendChainWhileAlive(enemy_master.card_die_chain, (card) => {
                if(card.card_type == CardType.Character) {
                    enemy_master.setEmo(enemy_master.emo + 3);
                }
            });
        });
    }
}