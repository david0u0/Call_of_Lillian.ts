import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { Player } from "../../game_core/enums";
import { TypeGaurd as TG, ICard } from "../../game_core/interface";
import { createCardUI } from "./card_ui";
import getEltSize from "./get_elemental_size";
import { GenCard, ShowBigCard } from "./show_big_card";

export function drawHands(hands: ICard[], ticker: PIXI.ticker.Ticker,
    loader: PIXI.loaders.Loader, showBigCard: ShowBigCard
) {
    for(let card of hands) {
        if(TG.isKnown(card) && !loader.resources[card.name]) {
            loader.add(card.name, `/card_image/${card.name}.jpg`);
        }
    }
    return new Promise<PIXI.Container>((resolve, reject) => {
        loader.load(() => {
            let container = new PIXI.Container();
            let { ew, eh } = getEltSize();
            let cur_offset = 0;
            for(let card of hands) {
                let card_ui = createCardUI(card, ew*4, eh*10, loader, showBigCard);
                container.addChild(card_ui);
                card_ui.position.set(cur_offset, 0);
                card_ui.rotation = 0.03;
                cur_offset += card_ui.width * 0.95;
            }
            if(hands.length > 9) {
                container.scale.set(9 / hands.length);
            }
            resolve(container);
        });
    });
}