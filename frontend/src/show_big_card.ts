import * as PIXI from "pixi.js";
import { ICard } from "../../game_core/interface";
import getEltSize from "./get_elemental_size";

export type GenCard = (card: ICard, w: number, h: number) => PIXI.Container;
export type ShowBigCard = (x: number, y: number, card: ICard, genCard: GenCard) => (() => void);

// TODO: 這裡洩漏了一堆記憶體= =
/**
 * @returns 把大圖銷毀的函式
 */
export function showBigCard(container: PIXI.Container, x: number, y: number,
    card: ICard, ticker: PIXI.ticker.Ticker, genCard: GenCard
): () => void {
    let { ew, eh } = getEltSize();
    let card_ui = genCard(card, ew*20, eh*20);
    y = y-card_ui.height; // 對準左下角
    card_ui.position.set(x, y+eh);
    container.addChild(card_ui);
    ticker.add(() => {
        if(card_ui && card_ui.y > y) {
            card_ui.y -= eh*0.1;
        }
    });
    return () => {
        card_ui.destroy();
        card_ui = null;
    };
}
