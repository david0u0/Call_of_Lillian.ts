import * as PIXI from "pixi.js";
import { ICard } from "../../game_core/interface";
import getEltSize from "./get_elemental_size";
import { drawCard } from "./draw_card";

export type ShowBigCard = (x: number, y: number, card: ICard,
    ticker: PIXI.ticker.Ticker, loader: PIXI.loaders.Loader) => (() => void);

// TODO: 這裡洩漏了一堆記憶體= =
/**
 * @returns 把大圖銷毀的函式
 */
export function showBigCard(container: PIXI.Container, x: number, y: number,
    card: ICard, ticker: PIXI.ticker.Ticker, loader: PIXI.loaders.Loader
): () => void {
    let { ew, eh } = getEltSize();
    let card_ui = drawCard(card, ew*22, eh*22, loader, true);
    y = y-card_ui.height; // 對準左下角
    // TODO: 應該以當前是在畫面上半還下半來決定該把卡圖往哪個方向呈現
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
