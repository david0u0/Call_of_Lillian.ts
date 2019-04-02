import { IArena, ICharacter } from "../../game_core/interface";
import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";
import { drawCardFace, getCardSize, drawCard, drawStrength } from "./draw_card";

import H from "../../game_core/test/real_card/arena/M市立綜合醫院";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/game_master";
import { my_loader } from "./card_loader";
import FrontendSelecter from "./frontend_selecter";
import { ShowBigCard } from "./show_big_card";

export class ArenaArea {
    public view = new PIXI.Container();

    private list: IArena[] = Array(10).fill(null);
    private readonly card_gap: number;
    private readonly card_w: number;
    private readonly card_h: number;
    private hovering_char = false;

    constructor(private player: Player, private gm: GameMaster, private selecter: FrontendSelecter,
        private ticker: PIXI.ticker.Ticker, private showBigCard: ShowBigCard
    ) {
        let { ew, eh } = getEltSize();
        let res = getCardSize(ew*4, eh*4, true);
        this.card_w = res.width;
        this.card_h = res.height;
        this.card_gap = 7*ew-res.width;

        for(let i = 0; i < 5; i++) {
            this.addArena(i);
        }

        gm.enter_chain.append(({ arena, char }) => {
            if(arena.owner == player) {
                this.enterChar(arena, char);
            }
        });
    }
    addArena(index: number, card?: IArena) {
        let offset = index*(this.card_w + this.card_gap) + this.card_gap;
        if(!card) {
            let rec = new PIXI.Graphics();
            rec.beginFill(0xFFFFFF, 0.5);
            rec.drawRoundedRect(offset, 0, this.card_w, this.card_h, 5);
            rec.endFill();
            this.view.addChild(rec);
        } else {
            my_loader.add(card.name).load(() => {
                let card_face = drawCardFace(card, this.card_w, this.card_h, true);
                card_face.position.set(offset, 0);
                this.view.addChild(card_face);

                card_face.interactive = true;
                card_face.on("click", () => {
                    if(this.selecter.selecting) {
                        this.selecter.onCardClicked(card);
                    } else {
                        // NOTE: 沒事應該不會去點場地卡 吧？
                    }
                });
                let destroy_big: () => void = null;
                card_face.on("mouseover", () => {
                    if(!this.hovering_char) {
                        destroy_big = this.showBigCard(
                            card_face.worldTransform.tx + card_face.width / 2,
                            card_face.worldTransform.ty + card_face.height / 2,
                            card, this.ticker);
                    }
                });
                card_face.on("mouseout", () => {
                    if(destroy_big) {
                        destroy_big();
                        destroy_big = null;
                    }
                });
            });
        }
    }
    private enterChar(arena: IArena, char: ICharacter) {
        let index = arena.position;
        let view = new PIXI.Container();
        let char_img = drawCardFace(char, this.card_gap * 0.6, this.card_h * 1.1);
        view.addChild(char_img);

        let s_area = drawStrength(this.gm, char, view.width * 0.8);
        s_area.position.set(view.width * 0.1, view.height - s_area.height / 2);
        view.addChild(s_area);

        let offset = index * (this.card_w + this.card_gap) + this.card_gap;
        view.rotation = -Math.PI / 4;
        if(arena.char_list.length == 0) {
            offset -= view.width;
            view.position.set(offset, this.card_h - view.width * 0.5);
        } else {
            offset += this.card_w * 0.7;
            view.position.set(offset, view.width * 0.35);
        }

        view.interactive = true;
        view.on("mouseover", () => {
            this.hovering_char = true;
        });
        view.on("mouseout", () => {
            this.hovering_char = false;
        });

        this.view.addChild(view);
    }
}