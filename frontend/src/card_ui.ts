import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd } from "../../game_core/interface";
import { BadOperationError } from "../../game_core/errors";

const H = 1000, W = 722;

export abstract class CardUI {
    public readonly container: PIXI.Container;
    private hovering = false;
    private _height: number;
    public get height() { return this._height; };
    private _width: number;
    public get width() { return this._width; };
    constructor(public readonly card: ICard, width: number, height: number,
        ticker: PIXI.ticker.Ticker, protected readonly loader: PIXI.loaders.Loader
    ) {
        this.container = new PIXI.Container();
        let ratio = Math.min(width / H, height / W);
        this._width = W * ratio;
        this._height = H * ratio;
        this.setCardDisplay(() => {
            let og_w = this.container.width;
            let og_h = this.container.height;
            let big_ratio = ratio * 1.1;
            let cur_ratio = ratio;
            this.container.scale.set(ratio * W / og_w, ratio * H / og_h);
            this.container.interactive = true;
            this.container.cursor = "pointer";
            this.container.on("mouseover", () => {
                this.hovering = true;
            });
            this.container.on("mouseout", () => {
                this.hovering = false;
            });
            ticker.add(() => {
                if(this.hovering && cur_ratio <= big_ratio) {
                    cur_ratio += 0.002;
                    this.container.scale.set(cur_ratio * W / og_w, cur_ratio * H / og_h);
                } else if(!this.hovering && cur_ratio >= ratio) {
                    cur_ratio -= 0.002;
                    this.container.scale.set(cur_ratio * W / og_w, cur_ratio * H / og_h);
                }
            });
            this.container.pivot.set(og_w/2, og_h/2);
        });
    }
    abstract setCardDisplay(callback: () => void);
}

export class UnknownCardUI extends CardUI {
    setCardDisplay(callback: () => void) {
        let back = new PIXI.Sprite(PIXI.loader.resources["card_back"].texture);
        this.container.addChild(back);
        callback();
    }
}

export class CharacterUI extends CardUI {
    setCardDisplay(callback: () => void) {
        if(TypeGaurd.isCharacter(this.card)) {
            let card_image = new PIXI.Sprite(this.loader.resources[this.card.name].texture);
            this.container.addChild(card_image);
            callback();
        } else {
            throw "??";
        }
    }
}