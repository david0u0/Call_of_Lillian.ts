import * as PIXI from "pixi.js";

import { GameMaster, BadOperationError } from "../../game_core/game_master";
import { Player } from "../../game_core/enums";
import { TypeGaurd as TG, ICard } from "../../game_core/interface";
import getEltSize from "./get_elemental_size";
import { ShowBigCard } from "./show_big_card";
import { drawCard } from "./draw_card";

const STEP = 9;

class HandUI {
    private list: ICard[];
    public readonly view: PIXI.Container;

    constructor(list: ICard[], private ticker: PIXI.ticker.Ticker,
        private loader: PIXI.loaders.Loader, private showBigCard: ShowBigCard,
        private getOffset: (c: PIXI.Container) => { x: number, y: number }
    ) {
        this.list = [...list];

        let view = new PIXI.Container();
        let { ew, eh } = getEltSize();
        let cur_offset = 0;
        for(let card of list) {
            let card_ui = drawCard(card, ew * 4, eh * 10, loader);
            card_ui = setupHandCardUI(card, card_ui, ticker, loader, showBigCard);
            view.addChild(card_ui);
            card_ui.position.set(cur_offset, 0);
            card_ui.rotation = 0.03;
            cur_offset += card_ui.width * 0.95;
        }
        this.view = view;

        let dummy = new PIXI.Text("");
        dummy.alpha = 0;
        this.view.addChild(dummy);
        dummy.x = cur_offset;

        this.resize();
        let { x, y } = getOffset(this.view);
        this.view.position.set(x, y);
    }
    private resize() {
        if(this.list.length > 8) {
            this.view.scale.set(8 / this.list.length);
        } else {
            this.view.scale.set(1);
        }
    }
    private move(children: PIXI.DisplayObject[], goal_x: number) {
        let handler = () => {
            let cur_x = children[0].x;
            if(Math.abs(cur_x - goal_x) > STEP) {
                if(cur_x > goal_x) {
                    for(let obj of children) {
                        obj.x -= STEP;
                    }
                } else {
                    for(let obj of children) {
                        obj.x += STEP;
                    }
                }
                let { x, y } = this.getOffset(this.view);
                this.view.position.set(x, y);
            } else {
                this.ticker.remove(handler);
            }
        };
        this.ticker.add(handler);
    }
    remove(arg: ICard | number) {
        if(TG.isCard(arg)) {
            this.remove(arg.seq);
        } else {
            let index: number;
            for(index = 0; index < this.list.length; index++) {
                if(this.list[index].seq == arg) {
                    break;
                }
            }
            if(index == this.list.length) {
                throw new BadOperationError("欲從手牌中移除不存在的牌");
            }
            let goal_x = this.view.children[index].x;
            this.list = [...this.list.slice(0, index), ...this.list.slice(index+1)];
            this.resize();
            this.move(this.view.children.slice(index+1), goal_x);
            this.view.children[index].destroy();
        }
    }
}

function setupHandCardUI(card: ICard, container: PIXI.Container,
    ticker: PIXI.ticker.Ticker, loader: PIXI.loaders.Loader, showBigCard: ShowBigCard
) {
    container.interactive = true;
    container.cursor = "pointer";
    if(TG.isKnown(card)) {
        let destroy_big_card: () => void = null;
        container.on("mouseover", () => {
            destroy_big_card = showBigCard(container.worldTransform.tx,
                container.worldTransform.ty + container.height * 0.5, card, ticker, loader);
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


export function constructHandUI(hands: ICard[], ticker: PIXI.ticker.Ticker,
    loader: PIXI.loaders.Loader, showBigCard: ShowBigCard,
    getOffset: (c: PIXI.Container) => {x: number, y: number }
): Promise<HandUI> {
    for(let card of hands) {
        if(TG.isKnown(card) && !loader.resources[card.name]) {
            loader.add(card.name, `/card_image/${card.name}.jpg`);
        }
    }
    return new Promise<HandUI>((resolve, reject) => {
        loader.load(() => {
            let container = new PIXI.Container();
            let { ew, eh } = getEltSize();
            let cur_offset = 0;
            for(let card of hands) {
                let card_ui = drawCard(card, ew * 4, eh * 10, loader);
                card_ui = setupHandCardUI(card, card_ui, ticker, loader, showBigCard);
                container.addChild(card_ui);
                card_ui.position.set(cur_offset, 0);
                card_ui.rotation = 0.03;
                cur_offset += card_ui.width * 0.95;
            }
            if(hands.length > 8) {
                container.scale.set(8 / hands.length);
            }
            resolve(new HandUI(hands, ticker, loader, showBigCard, getOffset));
        });
    });
}