import { IArena } from "../../game_core/interface";
import * as PIXI from "pixi.js";
import getEltSize from "./get_elemental_size";
import { drawCardFace, getCardSize } from "./draw_card";

import H from "../../game_core/test/real_card/arena/M市立綜合醫院";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/game_master";
import { my_loader } from "./card_loader";

export class ArenaArea {
    public view = new PIXI.Container();

    private list: IArena[] = Array(10).fill(null);
    private readonly card_gap: number;
    private readonly card_w: number;
    private readonly card_h: number;

    constructor() {
        let { ew, eh } = getEltSize();
        let res = getCardSize(ew*4, eh*4, true);
        this.card_w = res.width;
        this.card_h = res.height;
        this.card_gap = 7*ew-res.width;

        for(let i = 0; i < 5; i++) {
            this.addArena(i);
        }

    }
    addArena(index: number, card?: IArena) {
        let offset = index*(this.card_w + this.card_gap) + this.card_gap;
        if(!card) {
            let rec = new PIXI.Graphics();
            rec.beginFill(0xFFFFFF, 0.5);
            rec.drawRoundedRect(offset, 0, this.card_w, this.card_h, 5);
            rec.endFill();
            this.view.addChild(rec);
        }
        /*let card = new H(1, Player.Player1, new GameMaster());
        my_loader.add(card.name).load(() => {
            let card_face = drawCardFace(card, this.card_w, this.card_h, true);
            card_face.position.set(offset, 0);
            this.view.addChild(card_face);
        });*/
    }
}