import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { Player } from "../../game_core/enums";
import { TypeGaurd as TG, ICard } from "../../game_core/interface";
import getEltSize from "./get_elemental_size";
import { ShowBigCard } from "./show_big_card";
import { drawCard } from "./draw_card";

function setupHandCardUI(card: ICard, container: PIXI.Container,
    ticker: PIXI.ticker.Ticker, loader: PIXI.loaders.Loader, showBigCard: ShowBigCard
) {
    container.interactive = true;
    container.cursor = "pointer";
    if(TG.isKnown(card)) {
        let destroy_big_card: () => void = null;
        container.on("mouseover", () => {
            destroy_big_card = showBigCard(container.worldTransform.tx,
                container.worldTransform.ty + container.height*0.5, card, ticker, loader);
        });
        container.on("mouseout", () => {
            if(destroy_big_card) {
                destroy_big_card();
                destroy_big_card = null;
            }
        });
    }
    return container;
}


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
                let card_ui = drawCard(card, ew*4, eh*10, loader);
                card_ui = setupHandCardUI(card, card_ui, ticker, loader, showBigCard);
                container.addChild(card_ui);
                card_ui.position.set(cur_offset, 0);
                card_ui.rotation = 0.03;
                cur_offset += card_ui.width * 0.95;
            }
            if(hands.length > 8) {
                container.scale.set(8 / hands.length);
            }
            resolve(container);
        });
    });
}