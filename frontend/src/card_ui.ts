import { IKnownCard } from "../../game_core/interface";

const H = 90, W = 55;

abstract class CardUI {
    public readonly container: PIXI.Container;
    private hovering = false;
    constructor(width: number, height: number, ticker: PIXI.ticker.Ticker) {
        this.container = new PIXI.Container();
        this.setCardDisplay();
        let ratio = Math.min(width/this.container.width, height/this.container.height);
        let big_ratio = ratio + 0.01;
        let cur_ratio = ratio;
        this.container.scale.set(ratio);

        this.container.interactive = true;
        this.container.cursor = "pointer";
        this.container.on("mouseover", () => {
            this.hovering = true;
            this.container.scale.set(ratio + 0.01);
        });
        this.container.on("mouseout", () => {
            this.hovering = false;
            this.container.scale.set(ratio);
        });
        ticker.add(() => {
            if(this.hovering && cur_ratio <= big_ratio) {
                cur_ratio += 0.002;
                this.container.scale.set(cur_ratio);
            } else if(!this.hovering && cur_ratio >= ratio) {
                cur_ratio -= 0.002;
                this.container.scale.set(cur_ratio);
            }
        });
    }
    abstract setCardDisplay();
}

export class UnknownCardUI extends CardUI {
    setCardDisplay() {
        let back = new PIXI.Sprite(PIXI.loader.resources["card_back"].texture);
        this.container.addChild(back);
    }
}