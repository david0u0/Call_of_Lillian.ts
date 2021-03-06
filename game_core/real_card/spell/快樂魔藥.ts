import { GamePhase } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter } from "../../interface";
import { GetterChain } from "../../hook";

let name = "快樂魔藥";
let description = `對手的情緒必須為5或以上。
本咒語會留在場上直到對手將情緒歸零。此期間，對手每次進入場所需額外支付1魔力（不足者轉換為情緒傷害）。`;

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 3;
    can_play_phase = [GamePhase.InAction];

    max_caster = 1;
    min_caster = 1;

    check_before_play_chain = this.posessed(5, this.enemy_master.player);

    setupAliveEffect() {
        this.addActionWhileAlive(this.enemy_master.enter_chain, () => {
            this.enemy_master.punish(1);
        });
        this.addActionWhileAlive(this.enemy_master.set_emo_chain, async ({ emo }) => {
            if(emo == 0) {
                await this.my_master.retireCard(this);
            }
        });
    }
}