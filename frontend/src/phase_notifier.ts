import * as PIXI from "pixi.js";
import { GameMaster } from "../../game_core/master/game_master";
import { Player, GamePhase } from "../../game_core/enums";
import { getWinSize } from "./get_constant";

export class PhaseNotifier {
    private cur_era = 0;
    private pending_anime = new Array<() => void>();
    private anime_playing = false;
    public readonly view = new PIXI.Container();

    constructor(gm: GameMaster, player: Player, private ticker: PIXI.ticker.Ticker) {
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

        let anime = (txt_content) => {
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
                    if(Date.now() - time > 600) {
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

        gm.t_master.start_building_chain.append(() => {
            phase_txt.text = "建築階段";
            anime(`第${++this.cur_era}世代 - 建築階段`);
            anime("本階段只能打出場所卡");
        });
        gm.t_master.start_main_chain.append(() => {
            phase_txt.text = "主階段";
            anime(`第${this.cur_era}世代 - 主階段`);
            anime("請點選角色進入場所，或打出卡牌");
        });
        gm.t_master.start_exploit_chain.append(() => {
            phase_txt.text = "收獲階段";
            anime(`第${this.cur_era}世代 - 收獲階段`);
            anime("如欲使用場所，請點選其上的角色");
        });
        gm.w_master.declare_war_chain.append(() => {
            phase_txt.text = "戰鬥中";
            anime("戰鬥開始");
            anime("請點選我方角色作為攻擊者\n再點選敵方角色作為攻擊目標");
        });
        gm.w_master.end_war_chain.append(() => {
            phase_txt.text = "主階段";
            anime("戰鬥結束");
        });
    };
}