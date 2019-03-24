import { Character, Upgrade } from "../../../cards";
import { CardType, CardStat, BattleRole } from "../../../enums";

let name = "雨季的魔女．語霽";
let description = `**呼喚不幸的體質**：*雨季的魔女．語霽*不可攻擊或格擋。當其它角色進入同一個場所時，該角色承受一點情緒傷害。`;

export default class C extends Character {
    basic_battle_role = BattleRole.Civilian;
    name = name;
    description = desciption;
    basic_strength = 0;
    basic_mana_cost = 3;

    onPlay() {
        let master_chain = this.g_master.enter_chain;
        this.dominantChainWhileAlive(master_chain, arg => {
            if(this.arena_entered) {
                let my_arena = this.arena_entered;
                let { char, arena } = arg;
                // 不是自己，而且是同一個場所
                if (!arg.char.isEqual(this) && my_arena.isEqual(arena)) {
                    let pm = this.g_master.getMyMaster(char);
                    pm.setEmo(pm.emo + 1);
                }
            }
        });
    }
}