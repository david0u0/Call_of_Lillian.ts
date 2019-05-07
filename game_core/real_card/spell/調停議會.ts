import { CardSeries, BattleRole, GamePhase } from "../../enums";
import { Spell } from "../../cards";

let name = "調停議會";
let description = `超凡4
強制停止本次戰鬥，本世代雙方皆不可再宣戰。`;

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 3;
    can_play_phase = [GamePhase.InWar];

    max_caster = 1;
    min_caster = 1;
    instance = true;

    check_before_play_chain = this.beyond(4);

    async onPlay() {
        await super.onPlay();
        await this.g_master.w_master.endWar(false);
    }
    setupAliveEffect() {
        this.g_master.w_master.declare_war_chain.dominantCheck(() => {
            return { var_arg: "調停議會" };
        });
    }
}