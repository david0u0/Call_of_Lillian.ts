import { Event, Arena } from "../../cards";
import { IEvent, ICharacter, TypeGaurd as TG } from "../../interface";
import { CardSeries, Player } from "../../enums";

let name = "代理戰爭";
let description = `推進：角色戰力需大於0。
結算：你在每個世代第一次開戰時，得到5魔力。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;
    readonly basic_mana_cost = 3;
    readonly score = 2;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;
    readonly is_ending = false;

    checkCanPush(char: ICharacter|null) {
        if(char) {
            return this.my_master.getStrength(char) > 0;
        } else {
            return true;
        }
    }

    onFinish() { }
    onPush() { }

    has_declared = false;

    setupFinishEffect() {
        this.addActionWhileAlive(true, this.g_master.w_master.declare_war_chain, 
            async ({ declarer }) => {
                if(declarer == this.owner) {
                    if(this.has_declared) {
                        this.has_declared = true;
                        await this.my_master.addMana(5);
                    }
                }
            }
        );
        this.g_master.t_master.start_building_chain.append(() => {
            this.has_declared = false;
        });
    }
}