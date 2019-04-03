import { IArena, ICharacter, TypeGaurd } from "../../game_core/interface";
import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";
import { drawCardFace, getCardSize, drawCard, drawStrength } from "./draw_card";

import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/game_master";
import { my_loader } from "./card_loader";
import FrontendSelecter from "./frontend_selecter";
import { ShowBigCard } from "./show_big_card";
import { Constant } from "../../game_core/general_rules";

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
        let res = getCardSize(ew * 4, eh * 4, true);
        this.card_w = res.width;
        this.card_h = res.height;
        this.card_gap = 7 * ew - res.width;

        gm.enter_chain.append(({ arena, char }) => {
            if(arena.owner == player) {
                return { after_effect: () => this.enterChar(arena, char) };
            }
        });
        gm.getMyMaster(player).card_play_chain.append(card => {
            if(TypeGaurd.isArena(card)) {
                return { after_effect: () => this.addArena(card) };
            }
        });
    }
    addArena(card: IArena | IArena[]) {
        if(card instanceof Array) {
            for(let c of card) {
                this.addArena(c);
            }
            return;
        } else {
            let index = card.position;
            let offset = index * (this.card_w + this.card_gap) + this.card_gap;
            if(card.name == Constant.DUMMY_NAME) {
                let rec = new PIXI.Graphics();
                rec.beginFill(0xFFFFFF, 0.5);
                rec.drawRoundedRect(offset, 0, this.card_w, this.card_h, 5);
                rec.endFill();
                this.view.addChild(rec);
                this.setupArenaUI(rec, card);
            } else {
                my_loader.add(card.name).load(() => {
                    let card_face = drawCardFace(card, this.card_w, this.card_h, true);
                    card_face.position.set(offset, 0);
                    this.view.addChild(card_face);
                    this.setupArenaUI(card_face, card);

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
    }
    private setupArenaUI(obj: PIXI.DisplayObject, card: IArena) {
        obj.interactive = true;
        obj.on("click", () => {
            if(this.selecter.selecting) {
                this.selecter.onCardClicked(card);
            } else {
                // NOTE: 沒事應該不會去點場地卡 吧？
            }
        });

    }
    private enterChar(arena: IArena, char: ICharacter) {
        let index = arena.position;
        let view = new PIXI.Container();
        let char_img = drawCardFace(char, this.card_gap * 0.6, this.card_h * 1.1);
        view.addChild(char_img);

        let s_area = drawStrength(this.gm, char, view.width * 0.8, true);
        s_area.position.set(view.width * 0.1, view.height - s_area.height / 2);
        view.addChild(s_area);

        let offset = index * (this.card_w + this.card_gap) + this.card_gap;
        view.rotation = -Math.PI / 4;
        if(arena.char_list.length == 1) {
            offset -= view.width;
            view.position.set(offset, this.card_h - view.width * 0.5);
        } else {
            offset += this.card_w * 0.7;
            view.position.set(offset, view.width * 0.35);
        }

        view.interactive = true;
        let destroy_big: () => void = null;
        view.on("mouseover", () => {
            this.hovering_char = true;
            destroy_big = this.showBigCard(view.worldTransform.tx, view.worldTransform.ty, char, this.ticker);
        });
        view.on("mouseout", () => {
            this.hovering_char = false;
            if(destroy_big) {
                destroy_big();
            }
        });
        view.on("click", () => {
            if(this.selecter.selecting) {
                this.selecter.onCardClicked(char);
            }
        });

        this.view.addChild(view);
    }
}