import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";
import { my_loader } from "./card_loader";
import { ShowBigCard } from "./show_big_card";
import { BadOperationError } from "../../game_core/errors";
import { TypeGaurd, ICharacter } from "../../game_core/interface";
import { GameMaster } from "../../game_core/game_master";
import { Player } from "../../game_core/enums";
import { drawStrength } from "./draw_card";
import FrontendSelecter from "./frontend_selecter";

const H = 70, W = 50, MAX_CHAR = 9;

export class CharArea {
    public view = new PIXI.Container();

    private list: ICharacter[] = new Array(MAX_CHAR).fill(null);
    private tired_mask_view = new PIXI.Container();
    private chars_view = new PIXI.Container();
    private readonly c_width: number;
    private readonly c_height: number;


    constructor(private player: Player, private gm: GameMaster, private selecter: FrontendSelecter,
        private showBigCard: ShowBigCard, private ticker: PIXI.ticker.Ticker
    ) {
        let { ew, eh } = getEltSize();
        this.view.addChild(this.chars_view);
        this.view.addChild(this.tired_mask_view);
        let ratio = Math.min(ew * 2.5 / W, eh * 7 / H);
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
        // 向主持人註冊事件
        this.gm.getMyMaster(player).card_play_chain.append(card => {
            if(TypeGaurd.isCharacter(card)) {
                this.addChar(card);
            }
        });
    }

    private getOffset(index: number) {
        let { ew, eh } = getEltSize();
        if(index % 2 == 0) {
            let n = (8 - index) / 2;
            return (2 + n * 3) * ew;
        } else {
            let n = (index - 1) / 2;
            return (25 + n * 3) * ew;
        }
    }

    addChar(char: ICharacter, index?: number) {
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

                let container = new PIXI.Container();
                img.scale.set(this.c_width / og_w, this.c_height / og_h);
                container.addChild(img);
                container.position.set(offset, 0);

                let s_area = drawStrength(this.gm, char, container.width*0.6, true);
                container.addChild(s_area);
                s_area.position.set(img.width*0.2, img.height - s_area.height/2);

                this.setupCharUI(index, container);
                this.chars_view.addChildAt(container, index);
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

    private setupCharUI(index: number, view: PIXI.Container) {
        let char = this.list[index];
        let tired_mask = this.tired_mask_view.children[index];
        // 入場效果
        view.alpha = 0;
        let fade_in = () => {
            if(view.alpha < 1) {
                view.alpha += 0.1;
            } else {
                view.alpha = 1;
                this.ticker.remove(fade_in);
            }
        };
        // 大圖
        view.interactive = true;
        view.cursor = "pointer";
        let destroy_big: () => void = null;
        view.on("mouseover", () => {
            destroy_big = this.showBigCard(
                view.worldTransform.tx + view.width/2, view.worldTransform.ty + view.height/2,
                char, this.ticker);
        });
        view.on("mouseout", () => {
            if(destroy_big) {
                destroy_big();
                destroy_big = null;
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
        view.on("click", async evt => {
            if(this.selecter.selecting) {
                this.selecter.onCardClicked(char);
            } else {
                let x = evt.data.global.x;
                let y = evt.data.global.y;
                this.selecter.setMousePosition(x, y);
                let result = await this.gm.enterArena(char);
                if(result) {
                    if(destroy_big) {
                        destroy_big();
                        destroy_big = null;
                    }
                    // 移除UI
                    view.visible = false;
                    tired_mask.visible = false;
                }
            }
        });
    }
}