import * as PIXI from "pixi.js";
import { ICard } from "../../game_core/interface";
import { getEltSize, getWinSize } from "./get_screen_size";
import { drawCard, getCardSize } from "./draw_card";
import { GameMaster } from "../../game_core/game_master";

export type ShowBigCard = (x: number, y: number, card: ICard,
    ticker: PIXI.ticker.Ticker) => (() => void);

// TODO: 這裡洩漏了一堆記憶體= =
/**
 * @returns 把大圖銷毀的函式
 */
export function showBigCard(gm: GameMaster, container: PIXI.Container, x: number, y: number,
    card: ICard, ticker: PIXI.ticker.Ticker
): () => void {
    let s_width = getWinSize().width;
    let s_height = getWinSize().height;
    let { ew, eh } = getEltSize();
    let { width, height } = getCardSize(ew*20, eh*20);
    let card_ui = drawCard(gm, card, width, height, true);
    card_ui.position.set(x, y);
    container.addChild(card_ui);
    let tick_func = () => {
        if(card_ui && card_ui.y > y) {
            card_ui.y -= eh * 0.1;
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
    card_ui.pivot.set(pivot_x, pivot_y);

    return () => {
        card_ui.destroy();
        card_ui = null;
    };
}
