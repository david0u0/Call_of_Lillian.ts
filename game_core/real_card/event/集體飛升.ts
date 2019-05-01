import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd } from "../../interface";
import { CharStat, CardStat, Player } from "../../enums";

let name = "集體飛升";
let description = `當*集體飛升*存在場上中，每個基礎戰力為0或以下的角色額外得到1點戰力。
推進：你必需有5個或更多角色處於場所中。
結算：雙方場上與歷史區每有一個角色，加2分。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = true;
    readonly score = 4;
    readonly goal_progress_count = 4;
    readonly init_time_count = 3;

    basic_mana_cost = 4;

    setupAliveEffect() {
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            this.addGetterWhileAlive(true, pm.get_strength_chain, (str, { card }) => {
                if(TypeGaurd.isCharacter(card) && card.basic_strength <= 0) {
                    return { var_arg: str + 1 };
                }
            });
        }
    }

    checkCanPush() {
        let chars_in_arena = this.my_master.getAll(TypeGaurd.isCharacter, ch => {
            return ch.char_status == CharStat.InArena && ch.card_status == CardStat.Onboard;
        });
        return chars_in_arena.length >= 5;
    }

    onPush() {
        this.my_master.addMana(42);
    }

    onFinish() { }
    setupFinishEffect() {
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            pm.get_score_chain.append(score => {
                let chars = pm.getAll(TypeGaurd.isCharacter, ch => {
                    return ch.card_status == CardStat.Onboard || ch.card_status == CardStat.Retired;
                });
                return { var_arg: score + chars.length * 2 };
            });
        }
    }
}