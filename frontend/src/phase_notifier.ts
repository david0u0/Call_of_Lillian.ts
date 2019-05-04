import * as PIXI from "pixi.js";
import { GameMaster } from "../../game_core/master/game_master";
import { Player, GamePhase } from "../../game_core/enums";
import { getWinSize } from "./get_constant";
import FrontendSelecter from "./frontend_selecter";

export class PhaseNotifier {
    private cur_era = 0;
    private pending_anime = new Array<() => void>();
    private anime_playing = false;
    public readonly view = new PIXI.Container();

    constructor(private gm: GameMaster, private me: Player,
        private selecter: FrontendSelecter, private ticker: PIXI.ticker.Ticker
    ) {
        let { width, height } = getWinSize();
        let txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: width/20,
            fontWeight: "bold",
            fontFamily: "微軟正黑體",
            fill: 0xffca7a,
            strokeThickness: 2
        }));
        txt.anchor.set(0.5, 0.5);
        txt.position.set(width/2, height/2);
        this.view.addChild(txt);

        let phase_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: width/50,
            fontWeight: "bold",
            fontFamily: "微軟正黑體",
            fill: 0xffca7a,
            strokeThickness: 2
        }));
        phase_txt.anchor.set(1, 1);
        phase_txt.position.set(width, height);
        this.view.addChild(phase_txt);

        let anime = (txt_content: string, lasting_time=600) => {
            if(this.anime_playing) {
                let pending = () => anime(txt_content);
                this.pending_anime = [pending, ...this.pending_anime];
            } else {
                this.anime_playing = true;
                txt.text = txt_content;
                txt.alpha = 1;
                let time = Date.now();
                let fade_out = () => {
                    this.anime_playing = true;
                    if(Date.now() - time > lasting_time) {
                        if(txt.alpha > 0) {
                            txt.alpha -= 0.02;
                        } else {
                            ticker.remove(fade_out);
                            this.anime_playing = false;
                            if(this.pending_anime.length > 0) {
                                let a = this.pending_anime.pop();
                                a();
                            }
                        }
                    }
                };
                ticker.add(fade_out);
            }
        };

        gm.t_master.start_building_chain.appendDefault(() => {
            phase_txt.text = "準備階段";
            anime(`第${++this.cur_era}世代 - 準備階段`);
            anime("本階段只能打出場所卡");
        });
        gm.t_master.start_main_chain.appendDefault(() => {
            phase_txt.text = "主階段";
            anime(`第${this.cur_era}世代 - 主階段`);
            anime("請點選角色進入場所，或打出卡牌");
        });
        gm.t_master.start_exploit_chain.appendDefault(() => {
            phase_txt.text = "收獲階段";
            anime(`第${this.cur_era}世代 - 收獲階段`);
            anime("如欲使用場所，請點選其上的角色");
        });
        gm.w_master.declare_war_chain.appendDefault(() => {
            phase_txt.text = "戰鬥中";
            anime("戰鬥開始");
            anime("攻方選擇角色作為攻擊者\n再點選敵方角色作為攻擊目標", 1000);
        });
        gm.w_master.end_war_chain.appendDefault(() => {
            phase_txt.text = "主階段";
            anime("戰鬥結束");
            return {
                after_effect: () => this.askIfSkip()
            };
        });

        gm.t_master.start_turn_chain.appendDefault(() => {
            if(gm.t_master.cur_phase != GamePhase.InWar) {
                return {
                    after_effect: () => this.askIfSkip()
                };
            }
        });
        gm.t_master.spend_action_chain.appendDefault(() => {
            return {
                after_effect: async () => this.askIfSkip()
            };
        });

        gm.end_game_chain.appendDefault(player => {
            if(me == player) {
                alert("你贏惹！！");
            } else {
                alert("你輸惹！！GGGGGG");
            }
        });
    };

    private stopAskingSkip() {
        this.selecter.stopConfirm();
    }
    private askIfSkip() {
        this.stopAskingSkip();
        let p = this.gm.t_master.cur_player;
        let msg = this.gm.t_master.skip_is_rest ? "休息" : "跳過";
        (async () => {
            let res = await this.selecter.selectConfirm(p, null, msg);
            if(res) {
                await this.gm.t_master.skip(p, true);
            }
        })();
    }
}