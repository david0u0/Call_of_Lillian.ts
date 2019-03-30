import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { Player } from "../../game_core/enums";
import { TypeGaurd as TG, ICard } from "../../game_core/interface";
import { UnknownCardUI, CardUI } from "./card_ui";
import getEltSize from "./get_elemental_size";

export function drawHands(hands: ICard[], ticker: PIXI.ticker.Ticker) {
    let container = new PIXI.Container();
    let { ew, eh } = getEltSize();
    let cur_offset = 0;
    for(let card of hands) {
        let card_ui: CardUI;
        if(TG.isUnKnown(card)) {
            card_ui = new UnknownCardUI(card, ew*2.5, eh*5, ticker);
        } else {
            card_ui = new UnknownCardUI(card, ew*2.5, eh*5, ticker);
        }
        container.addChild(card_ui.container);
        card_ui.container.position.set(cur_offset+card_ui.width/2, card_ui.height/2);
        card_ui.container.rotation = 0.03;
        cur_offset += card_ui.width*0.9;
    }
    if(hands.length > 8) {
        container.scale.set(8/hands.length);
    }
    return container;
}