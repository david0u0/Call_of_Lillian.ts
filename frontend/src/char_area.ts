import { ICharacter } from "../../game_core/interface";
import * as PIXI from "pixi.js";
import getEltSize from "./get_elemental_size";
import { my_loader } from "./card_loader";
import { ShowBigCard } from "./show_big_card";

const H = 50, W = 50;

export class CharArea {
    private list: ICharacter[] = [];
    public view = new PIXI.Container();

    constructor(private showBIgCard: ShowBigCard, private ticker: PIXI.ticker.Ticker) { }

    async addChar(char: ICharacter, index: number) {
        let { ew, eh } = getEltSize();
        let img = await this.drawChar(char, ew*3, eh*6, (0.5 + index*3.5) * ew);
        this.view.addChild(img);
        img.alpha = 0;
        let fade_in = () => {
            if(img.alpha < 1) {
                img.alpha += 0.1;
            } else {
                img.alpha = 1;
                this.ticker.remove(fade_in);
            }
        };
        this.ticker.add(fade_in);
    }
    private drawChar(char: ICharacter, width: number, height: number, offset: number) {
        let ratio = Math.min(width / W, height / H);
        return new Promise<PIXI.Sprite>(resolve => {
            my_loader.add(char).load(() => {
                let img = new PIXI.Sprite(my_loader.resources[char.name].texture);
                let og_w = img.width;
                let og_h = img.height;
                img.scale.set(ratio * W / og_w, ratio * H / og_h);
                img.position.set(offset, 0);
                this.view.addChild(img);

                img.interactive = true;
                img.cursor = "pointer";
                let destroy: () => void = null;
                img.on("mouseover", () => {
                    destroy = this.showBIgCard(img.worldTransform.tx, img.worldTransform.ty + img.height,
                        char, this.ticker);
                });
                img.on("mouseout", () => {
                    if(destroy) {
                        destroy();
                        destroy = null;
                    }
                });
                resolve(img);
            });
        });
    }
}