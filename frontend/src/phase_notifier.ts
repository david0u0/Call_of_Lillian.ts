import * as PIXI from "pixi.js";
import { GameMaster } from "../../game_core/game_master";
import { Player, GamePhase } from "../../game_core/enums";
import { getWinSize } from "./get_screen_size";

export class PhaseNotifier {
    private cur_era = 1;
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
                            txt.alpha -= 0.04;
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
            anime(`第${this.cur_era++}世代 - 建築階段`);
        });
        gm.t_master.start_turn_chain.append(({ prev, next }) => {
            if(gm.t_master.cur_phase != GamePhase.Setup) {
                if(player == next) {
                    anime("輪到你囉^Q^");
                } else {
                    anime("輪到對手");
                }
            }
        });
        gm.t_master.start_main_chain.append(() => {
            anime(`第${this.cur_era++}世代 - 主階段`);
        });
    };
}