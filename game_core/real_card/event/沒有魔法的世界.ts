import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd } from "../../interface";
import { Player, GamePhase, CardStat } from "../../enums";

let name = "沒有魔法的世界";
let description = `（結局）本事件只能在準備階段打出。
*沒有魔法的世界*不可推進。當世代結束時，若對手的魔力收入少於3，則本事件自動完成。
結算：結算區沒有非結局事件的玩家，額外加2分。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = true;
    readonly score = 2;
    readonly goal_progress_count = 1;
    readonly init_time_count = 3;
    readonly can_play_phase = [GamePhase.Building];

    basic_mana_cost = 5;

    readonly data = { e_income: 0 };

    setupAliveEffect() {
        // 插入一條沒有id的規則，使它無法被屏蔽。
        this.push_chain.appendCheck(() => {
            return { var_arg: false };
        });

        this.addActionWhileAlive(true, this.g_master.t_master.start_exploit_chain, () => {
            this.data.e_income = 0;
        });

        let em = this.enemy_master;
        em.exploit_chain.append(() => {
            let mem_mana = em.mana;
            return {
                after_effect: () => {
                    if(mem_mana < em.mana) {
                        // 魔力變多了，代表是魔力收入
                        this.data.e_income += em.mana - mem_mana;
                    }
                }
            };
        });

        this.addActionWhileAlive(true, this.g_master.t_master.start_building_chain, () => {
            if(this.data.e_income < 3) {
                this.my_master.finishEvent(null, this);
            }
        });
    }

    checkCanPush() { return false; }

    onPush() { }

    onFinish() { }

    setupFinishEffect() {
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            pm.get_score_chain.append(score => {
                let evts = pm.events_finished.filter(e => !e.is_ending);
                if(evts.length == 0) {
                    return { var_arg: score + 2 };
                }
            });
        }
    }
}