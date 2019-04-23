import * as PIXI from "pixi.js";
import { ICard, TypeGaurd } from "../../game_core/interface";
import { getEltSize, getWinSize } from "./get_constant";
import { drawCard, getCardSize } from "./draw_card";
import { GameMaster } from "../../game_core/master/game_master";

export type ShowBigCard = (x: number, y: number, card: ICard,
    ticker: PIXI.ticker.Ticker) => (() => void);

// TODO: 這裡洩漏了一堆記憶體= =
/**
 * @returns 把大圖銷毀的函式
 */
export function showBigCard(gm: GameMaster, container: PIXI.Container, x: number, y: number,
    card: ICard, ticker: PIXI.ticker.Ticker
): () => void {
    let view = new PIXI.Container();
    let s_width = getWinSize().width;
    let s_height = getWinSize().height;
    let { ew, eh } = getEltSize();
    let card_ui = drawSingleBig(gm, card, 0);
    view.addChild(card_ui);

    let { height, width } = card_ui;

    let scroll_func = (evt: WheelEvent) => {
        let sign = evt.wheelDelta > 0 ? 1 : -1;
        let new_y = Math.min(y, view.y + eh * sign * 3);
        view.y = new_y;
    };
    if(TypeGaurd.isCharacter(card) && card.upgrade_list.length > 0) {
        for(let [i, upgrade] of card.upgrade_list.entries()) {
            view.addChild(drawSingleBig(gm, upgrade, i+1));
        }
        window.addEventListener("wheel", scroll_func);
    }

    view.position.set(x, y+eh);
    let tick_func = () => {
        if(view && view.y > y) {
            view.y -= eh * 0.1;
        } else {
            ticker.remove(tick_func);
        }
    };
    ticker.add(tick_func);

    let pivot_x = 0, pivot_y = 0;
    if(x > s_width/2) {
        pivot_x = width;
    }
    if(y > s_height/2) {
        pivot_y = height;
    }
    view.pivot.set(pivot_x, pivot_y);

    container.addChild(view);
    return () => {
        if(view) {
            view.destroy();
        }
        view = null;
        window.removeEventListener("wheel", scroll_func);
    };
}

function drawSingleBig(gm: GameMaster, card: ICard, index: number) {
    let view = new PIXI.Container();
    let { ew, eh } = getEltSize();
    let { width, height } = getCardSize(ew*20, eh*20);
    let card_ui = drawCard(gm, card, width, height, true);
    card_ui.y = (card_ui.height) * index;
    return card_ui;
}
