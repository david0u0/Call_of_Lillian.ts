import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd as TG } from "../../game_core/interface";
import { ShowBigCard } from "./show_big_card";

const H = 1000, W = 722;

function setupUI(card: ICard, width: number, height: number,
    loader: PIXI.loaders.Loader, container: PIXI.Container, showBigCard: ShowBigCard
) {
    container.interactive = true;
    container.cursor = "pointer";
    if(TG.isKnown(card)) {
        let destroy_big_card: () => void = null;
        container.on("mouseover", () => {
            let genCard = (card: ICard, w: number, h: number) => createCardDisplay(card, w, h, loader);
            destroy_big_card = showBigCard(container.worldTransform.tx,
                container.worldTransform.ty+container.height*0.6, card, genCard);
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

function createCardDisplay(card: ICard, width: number, height: number, loader: PIXI.loaders.Loader) {
    let container = new PIXI.Container;
    if(TG.isKnown(card)) {
        let card_image = new PIXI.Sprite(loader.resources[card.name].texture);
        container.addChild(card_image);
    } else {
        let back = new PIXI.Sprite(PIXI.loader.resources["card_back"].texture);
        container.addChild(back);
    }
    let ratio = Math.min(width / H, height / W);
    let og_w = container.width;
    let og_h = container.height;
    let big_ratio = ratio * 1.1;
    let cur_ratio = ratio;
    container.scale.set(ratio * W / og_w, ratio * H / og_h);
    //container.pivot.set(og_w / 2, og_h / 2);
    return container;
}

export function createCardUI(card: ICard, width: number, height: number,
    loader: PIXI.loaders.Loader, showBigCard?: ShowBigCard
) {
    let container = createCardDisplay(card, width, height, loader);
    return setupUI(card, width, height, loader, container, showBigCard);
}