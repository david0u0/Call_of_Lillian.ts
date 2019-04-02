import * as PIXI from "pixi.js";

import { BadOperationError, GameMaster } from "../../game_core/game_master";
import { TypeGaurd as TG, ICard } from "../../game_core/interface";
import { getEltSize, getWinSize } from "./get_screen_size";
import { ShowBigCard } from "./show_big_card";
import { drawCard } from "./draw_card";
import { my_loader } from "./card_loader";
import FrontendSelecter from "./frontend_selecter";

// FIXME: 當一張卡被 destroy 時，如果它的大圖還開著，會永遠關不了（因為沒有觸發 mouseout 事件）
// FIXME: 要處理好幾張卡被加入/移除的效果

const STEP = 9;

class HandUI {
    private list: ICard[];
    private readonly card_gap: number;
    public readonly view: PIXI.Container;

    constructor(private selecter: FrontendSelecter, private gm: GameMaster, list: ICard[],
        private ticker: PIXI.ticker.Ticker, private showBigCard: ShowBigCard,
        private getOffset: (c: PIXI.Container) => { x: number, y: number }
    ) {
        this.list = [...list];
        let view = new PIXI.Container();
        let { ew, eh } = getEltSize();
        let cur_offset = 0;
        for(let card of list) {
            let card_ui = drawCard(this.gm, card, ew * 3, eh * 10);
            this.card_gap = card_ui.width * 0.95;
            card_ui = this.setupHandCardUI(card, card_ui);
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
        if(this.list.length > 7) {
            this.view.scale.set(7 / this.list.length);
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
            if(my_loader.resources[card.name]) {
                this.addLoaded(card);
            } else {
                my_loader.add(card.name).load(() => {
                    this.addLoaded(card);
                });
            }
        } else {
            this.addLoaded(card);
        }
    }
    private addLoaded(card: ICard) {
        let { ew, eh } = getEltSize();
        let card_ui = drawCard(this.gm, card, ew * 3.5, eh * 10);
        let offset = this.list.length * this.card_gap;
        card_ui = this.setupHandCardUI(card, card_ui);
        card_ui.position.set(offset, 0);
        card_ui.rotation = 0.03;
        let index = this.list.length;
        this.list.push(card);
        this.resize();
        let children_to_move = this.view.children.slice(this.view.children.length - 1);
        let goal_x = children_to_move[0].x + this.card_gap;
        this.move(children_to_move, goal_x, () => {
            this.view.addChildAt(card_ui, index);
        });
    }
    private setupHandCardUI(card: ICard, card_ui: PIXI.Container) {
        card_ui.interactive = true;
        card_ui.cursor = "pointer";
        if(TG.isKnown(card)) {
            let destroy_big_card: () => void = null;
            card_ui.on("mouseover", () => {
                destroy_big_card = this.showBigCard(card_ui.worldTransform.tx,
                    getWinSize().height, card, this.ticker);
            });
            card_ui.on("mouseout", () => {
                if(destroy_big_card) {
                    destroy_big_card();
                    destroy_big_card = null;
                }
            });
            card_ui.on("click", async evt => {
                if(this.selecter.selecting) {
                    this.selecter.onCardClicked(card);
                } else {
                    let pm = this.gm.getMyMaster(card);
                    this.selecter.setMousePosition(evt.data.global.x, evt.data.global.y);
                    if(await pm.playCard(card)) {
                        if(destroy_big_card) {
                            destroy_big_card();
                            destroy_big_card = null;
                        }
                        this.remove(card);
                    }
                }
            });
        }
        return card_ui;
    }
}

export function constructHandUI(selecter: FrontendSelecter, gm: GameMaster, hands: ICard[],
    ticker: PIXI.ticker.Ticker, showBigCard: ShowBigCard,
    getOffset: (c: PIXI.Container) => { x: number, y: number }
): Promise<HandUI> {
    for(let card of hands) {
        if(TG.isKnown(card) && !my_loader.resources[card.name]) {
            my_loader.add(card.name);
        }
    }
    return new Promise<HandUI>((resolve, reject) => {
        my_loader.load(() => {
            resolve(new HandUI(selecter, gm, hands, ticker, showBigCard, getOffset));
        });
    });
}