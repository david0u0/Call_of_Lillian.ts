import { ICharacter, IArena } from "../../game_core/interface";
import * as PIXI from "pixi.js";
import getEltSize from "./get_elemental_size";
import { my_loader } from "./card_loader";
import { ShowBigCard } from "./show_big_card";
import { BadOperationError } from "../../game_core/errors";

const H = 50, W = 40, MAX_CHAR = 9;

export class CharArea {
    private list: ICharacter[] = new Array(MAX_CHAR).fill(null);
    public view = new PIXI.Container();

    constructor(private showBIgCard: ShowBigCard, private ticker: PIXI.ticker.Ticker) { }

    async addChar(char: ICharacter, index?: number) {
        if(typeof index == "number") {
            if(this.list[index]) {
                throw new BadOperationError("嘗試將角色加入至有人的位置！");
            } else if(index >= MAX_CHAR) {
                throw new BadOperationError("嘗試加入超過上限的角色！");
            }
            let { ew, eh } = getEltSize();
            let offset = (() => {
                if(index % 2 == 0) {
                    let n = (8 - index) / 2;
                    return (1.5 + n * 3.5) * ew;
                } else {
                    let n = (index-1)/2;
                    return (23.5 + n*3) * ew;
                }
            })();
            let img = await this.drawChar(char, ew * 2.5, eh * 6, offset);
            this.setupCharUI(char, img);
            this.view.addChildAt(img, index);
        } else {
            let i = 0;
            for(i = 0; i < MAX_CHAR; i++) {
                if(!this.list[i]) {
                    break;
                }
            }
            this.addChar(char, i);
        }
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

    private setupCharUI(char: ICharacter, img: PIXI.Sprite) {
        // 大圖
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
        // 角色疲勞
    }
}