import { CardSeries, Player, GamePhase } from "../../enums";
import { Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "意識遊樂場";
let description = "使用：4魔力→使你的情緒恢復至本次收獲階段開始時的狀態，並免疫所有情緒傷害，直到收獲階段結束。";

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 4;
    series = [ CardSeries.Entertainment ];

    public readonly data = {
        position: -1,
        has_triggered1: false,
        has_triggered2: false,
        mem_emo1: 0,
        mem_emo2: 0,
    };

    setupAliveEffect() {
        /** 絕不可在收獲階段以外使用 */
        this.exploit_chain.appendCheckDefault(() => {
            if(this.g_master.t_master.cur_phase != GamePhase.Exploit) {
                return { var_arg: false };
            }
        });

        this.g_master.t_master.start_exploit_chain.append(() => {
            this.data.has_triggered1 = false;
            this.data.has_triggered2 = false;
            this.data.mem_emo1 = this.g_master.getMyMaster(Player.Player1).emo;
            this.data.mem_emo2 = this.g_master.getMyMaster(Player.Player2).emo;
        });
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            this.addActionWhileAlive(pm.set_emo_chain, ({ emo }) => {
                let mem_emo = p == Player.Player1 ? this.data.mem_emo1 : this.data.mem_emo2;
                if(this.g_master.t_master.cur_phase == GamePhase.Exploit && emo > mem_emo) {
                    // 確實是情緒傷害，而且確實在收獲階段
                    if((p == Player.Player1 && this.data.has_triggered1)
                        || (p == Player.Player2 && this.data.has_triggered2)
                    ) {
                        // 確實啟動了這個效果
                        return { intercept_effect: true };
                    }
                }
            });
        }
    }

    async onExploit(char: ICharacter|Player) {
        let [p, caller] = this.getPlayerAndCaller(char);
        let pm = this.g_master.getMyMaster(char);
        let mem_emo = p == Player.Player1 ? this.data.mem_emo1 : this.data.mem_emo2;
        await pm.addEmo(-pm.emo + mem_emo);
        if(p == Player.Player1) {
            this.data.has_triggered1 = true;
        } else {
            this.data.has_triggered2 = true;
        }
    }
}