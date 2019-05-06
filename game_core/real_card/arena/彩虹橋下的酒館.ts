import { CardType, CardSeries, BattleRole, Player, GamePhase } from "../../enums";
import { Character, Upgrade, Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "彩虹橋下的酒館";
let description = "使用：5魔力→恢復1情緒。本次收獲階段，你每使用一次場所，均造成對手一點情緒傷害。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 5;
    series = [ CardSeries.Entertainment ];
    data = {
        position: -1,
        triggered: {
            [Player.Player1]: 0,
            [Player.Player2]: 0
        }
    };

    async onExploit(char: ICharacter | Player) {
        let [p, caller] = this.getPlayerAndCaller(char);
        this.data.triggered[p]++;
        await this.g_master.getMyMaster(p).addEmo(-1, caller);
    }
    async setupAliveEffect() {
        /** 絕不可在收獲階段以外使用 */
        this.exploit_chain.appendCheckDefault(() => {
            if(this.g_master.t_master.cur_phase != GamePhase.Exploit) {
                return { var_arg: false };
            }
        });

        this.g_master.t_master.start_exploit_chain.append(() => {
            this.data.triggered[Player.Player1] = 0;
            this.data.triggered[Player.Player2] = 0;
        });
        for(let p of [Player.Player1, Player.Player2]) {
            let my_m = this.g_master.getMyMaster(p);
            let enemy_m = this.g_master.getEnemyMaster(p);
            my_m.exploit_chain.append(() => {
                let amount = this.data.triggered[p];
                enemy_m.addEmo(amount);
            });
        }
    }
}