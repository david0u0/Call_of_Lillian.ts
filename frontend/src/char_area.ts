import * as PIXI from "pixi.js";
import getEltSize from "./get_elemental_size";
import { my_loader } from "./card_loader";
import { ShowBigCard } from "./show_big_card";
import { BadOperationError } from "../../game_core/errors";
import { Character } from "../../game_core/cards";

const H = 50, W = 40, MAX_CHAR = 9;

export class CharArea {
    public view = new PIXI.Container();

    private list: Character[] = new Array(MAX_CHAR).fill(null);
    private tired_mask_view = new PIXI.Container();
    private chars_view = new PIXI.Container();
    private readonly c_width: number;
    private readonly c_height: number;


    constructor(private showBIgCard: ShowBigCard, private ticker: PIXI.ticker.Ticker) {
        let { ew, eh } = getEltSize();
        this.view.addChild(this.chars_view);
        this.view.addChild(this.tired_mask_view);
        let ratio = Math.min(ew * 2.5 / W, eh * 5.5 / H);
        this.c_width = ratio * W;
        this.c_height = ratio * H;

        for(let i = 0; i < MAX_CHAR; i++) {
            let mask = new PIXI.Graphics();
            mask.beginFill(0, 0.5);
            mask.drawRoundedRect(0, 0, this.c_width, this.c_height, 5);
            mask.endFill();
            mask.position.set(this.getOffset(i), 0);
            mask.alpha = 0;
            this.tired_mask_view.addChild(mask);
        }
    }

    private getOffset(index: number) {
        let { ew, eh } = getEltSize();
        if(index % 2 == 0) {
            let n = (8 - index) / 2;
            return (1.5 + n * 3.5) * ew;
        } else {
            let n = (index - 1) / 2;
            return (23.5 + n * 3) * ew;
        }
    }

    addChar(char: Character, index?: number) {
        if(typeof index == "number") {
            if(this.list[index]) {
                throw new BadOperationError("嘗試將角色加入至有人的位置！");
            } else if(index >= MAX_CHAR) {
                throw new BadOperationError("嘗試加入超過上限的角色！");
            }
            this.list[index] = char;
            let offset = this.getOffset(index);
            my_loader.add(char).load(() => {
                let img = new PIXI.Sprite(my_loader.resources[char.name].texture);
                let og_w = img.width;
                let og_h = img.height;
                img.scale.set(this.c_width / og_w, this.c_height / og_h);
                img.position.set(offset, 0);
                this.setupCharUI(index, img);
                this.chars_view.addChildAt(img, index);
            });
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

    private setupCharUI(index: number, img: PIXI.Sprite) {
        let char = this.list[index];
        let tired_mask = this.tired_mask_view.children[index];
        // 入場效果
        img.alpha = 0;
        let fade_in = () => {
            if(img.alpha < 1) {
                img.alpha += 0.1;
            } else {
                img.alpha = 1;
                this.ticker.remove(fade_in);
            }
        };
        // 大圖
        img.interactive = true;
        img.cursor = "pointer";
        let destroy: () => void = null;
        img.on("mouseover", () => {
            destroy = this.showBIgCard(
                img.worldTransform.tx+img.width/2, img.worldTransform.ty + img.height/2,
                char, this.ticker);
        });
        img.on("mouseout", () => {
            if(destroy) {
                destroy();
                destroy = null;
            }
        });
        this.ticker.add(fade_in);
        // 角色疲勞
        char.change_char_tired_chain.append(is_tired => {
            if(is_tired && !char.is_tired) {
                let fade_in = () => {
                    if(tired_mask.alpha < 0.7) {
                        tired_mask.alpha += 0.1;
                    } else {
                        tired_mask.alpha = 0.7;
                        this.ticker.remove(fade_in);
                    }
                };
                this.ticker.add(fade_in);
            } else if(!is_tired && char.is_tired) {
                let fade_out = () => {
                    if(tired_mask.alpha > 0) {
                        tired_mask.alpha -= 0.1;
                    } else {
                        tired_mask.alpha = 0;
                        this.ticker.remove(fade_out);
                    }
                };
                this.ticker.add(fade_out);
            }
        });
        // 角色進入場所
        char.enter_arena_chain.append(() => {
            img.alpha = 0;
        });

        /*img.on("click", () => {
            async char.g_master.enterArena(char);
        });*/
    }
}