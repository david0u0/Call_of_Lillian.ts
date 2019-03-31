import * as PIXI from "pixi.js";

import { BadOperationError } from "../../game_core/game_master";
import { TypeGaurd as TG, ICard } from "../../game_core/interface";
import getEltSize from "./get_elemental_size";
import { ShowBigCard } from "./show_big_card";
import { drawCard } from "./draw_card";

// FIXME: 當一張卡被 destroy 時，如果它的大圖還開著，會永遠關不了（因為沒有觸發 mouseout 事件）

const STEP = 9;

class HandUI {
    private list: ICard[];
    private readonly card_gap: number;
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
            let card_ui = drawCard(card, ew * 3.5, eh * 10, loader);
            this.card_gap = card_ui.width * 0.95;
            card_ui = setupHandCardUI(card, card_ui, ticker, loader, showBigCard);
            view.addChild(card_ui);
            card_ui.position.set(cur_offset, 0);
            card_ui.rotation = 0.03;
            cur_offset += this.card_gap;
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
    private move(children: PIXI.DisplayObject[], goal_x: number, callback?: () => void) {
        let handler = () => {
            let cur_x = children[0].x;
            if(Math.abs(cur_x - goal_x) > STEP) {
                let { x, y } = this.getOffset(this.view);
                this.view.position.set(x, y);
                if(cur_x < goal_x) {
                    for(let obj of children) {
                        obj.x += STEP;
                    }
                } else {
                    for(let obj of children) {
                        obj.x -= STEP;
                    }
                }
            } else {
                this.ticker.remove(handler);
                children.forEach((obj, i) => {
                    obj.x = goal_x + i * this.card_gap;
                });
                if(callback) {
                    callback();
                }
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
    add(card: ICard) {
        // 檢查這張卡圖載進來了沒
        if(TG.isKnown(card)) {
            if(this.loader.resources[card.name]) {
                this.addLoaded(card);
            } else {
                this.loader.add(card.name, `/card_image/${card.name}.jpg`).load(() => {
                    this.addLoaded(card);
                });
            }
        } else {
            this.addLoaded(card);
        }
    }
    private addLoaded(card: ICard) {
        let { ew, eh } = getEltSize();
        let card_ui = drawCard(card, ew * 3.5, eh * 10, this.loader);
        let offset = this.list.length * this.card_gap;
        card_ui = setupHandCardUI(card, card_ui, this.ticker, this.loader, this.showBigCard);
        card_ui.position.set(offset, 0);
        card_ui.rotation = 0.03;
        let index = this.list.length;
        this.list.push(card);
        this.resize();
        this.move(this.view.children.slice(index), offset + this.card_gap, () => {
            this.view.addChildAt(card_ui, index);
        });
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
    getOffset: (c: PIXI.Container) => { x: number, y: number }
): Promise<HandUI> {
    for(let card of hands) {
        if(TG.isKnown(card) && !loader.resources[card.name]) {
            loader.add(card.name, `/card_image/${card.name}.jpg`);
        }
    }
    return new Promise<HandUI>((resolve, reject) => {
        loader.load(() => {
            resolve(new HandUI(hands, ticker, loader, showBigCard, getOffset));
        });
    });
}