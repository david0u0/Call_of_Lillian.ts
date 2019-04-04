import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";
import { drawCard, drawCardFace } from "./draw_card";
import { my_loader } from "./card_loader";

export class EventArea {
    public readonly view = new PIXI.Container();
    constructor() {
        let { ew, eh } = getEltSize();
        let mask = new PIXI.Graphics();
        mask.beginFill(0, 0.5);
        mask.drawRoundedRect(0, 0, 5.5 * ew, 21 * eh, 5);
        mask.endFill();
        this.view.addChild(mask);

        my_loader.add("M市立綜合醫院").load(() => {
            for(let i = 0; i < 3; i++) {
                let evt_ui = new PIXI.Container();
                let card = drawCardFace("M市立綜合醫院", 3 * ew, 5 * eh, true);
                let text1 = new PIXI.Text("4/5", new PIXI.TextStyle({
                    fontSize: ew,
                    fill: 0xffffff
                }));
                let text2 = new PIXI.Text("4", new PIXI.TextStyle({
                    fontSize: ew,
                    fill: 0xffffff
                }));
                text1.anchor.set(0, 0.5);
                text1.position.set(0, card.height / 4);
                text2.anchor.set(0, 0.5);
                card.x = (5.5 * ew - card.width) / 2;
                text2.position.set(card.width + card.x, card.height / 4);
                evt_ui.addChild(card);
                evt_ui.addChild(text1);
                evt_ui.addChild(text2);

                evt_ui.y = 2 * ew * i;
                this.view.addChild(evt_ui);
            }

        });
    }
}