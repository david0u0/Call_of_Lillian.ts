import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd } from "../../interface";
import { Player, CardStat } from "../../enums";

let name = "老闆的名字是瓦爾基麗";
let description = `推進：你戰力最高的兩個角色需處於對手的同一個場所→搶奪對手2魔力。
結算：雙方的分數額外加上手下戰力次高角色的戰力。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = true;
    readonly score = 3;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;

    basic_mana_cost = 4;

    private getSecondStr(player: Player) {
        let pm = this.g_master.getMyMaster(player);
        let chars = pm.characters.sort((c1, c2) => {
            return pm.getStrength(c2) - pm.getStrength(c1);
        });
        if(chars.length < 2) {
            return 0;
        } else {
            return pm.getStrength(chars[1]);
        }
    }

    checkCanPush(char: ICharacter | null) {
        let snd_str = this.getSecondStr(this.owner);
        for(let arena of this.enemy_master.arenas) {
            let count = 0;
            for(let char of arena.char_list) {
                if(char && this.my_master.getStrength(char) >= snd_str) {
                    count++;
                }
            }
            if(count >= 2) {
                return true;
            }
        }
        return false;
    }

    async onFinish() { }

    async onPush() {
        let mana = Math.min(2, this.enemy_master.mana);
        await this.my_master.addMana(mana);
        await this.enemy_master.addMana(-mana);
    }

    setupFinishEffect() {
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            pm.get_score_chain.append(score => {
                return { var_arg: score + this.getSecondStr(p) };
            });
        }
    }
}