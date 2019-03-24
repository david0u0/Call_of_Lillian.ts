import { Character, Upgrade } from "../../../cards";
import { CardType, CardStat, BattleRole } from "../../../enums";

let name = "雨季的魔女．語霽";
let description = `**呼喚不幸的體質**：當其它角色進入同一個場所時，該角色承受一點情緒傷害。`;

export default class C extends Character {
    name = name;
    description = description;
    basic_strength = 2;
    basic_mana_cost = 4;

    onPlay() {
        let master_chain = this.g_master.enter_chain;
        this.dominantChainWhileAlive(master_chain, arg => {
            let { char, arena } = arg;
            if (!char.isEqual(this) && arena.isEqual(this.arena_entered)) {
                let pm = this.g_master.getMyMaster(char);
                pm.setEmo(pm.emo + 1);
            }
        });
    }
}