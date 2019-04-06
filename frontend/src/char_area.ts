import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";
import { my_loader } from "./card_loader";
import { ShowBigCard } from "./show_big_card";
import { BadOperationError } from "../../game_core/errors";
import { TypeGaurd, ICharacter, IEvent, IArena, ICard } from "../../game_core/interface";
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
            mask.beginFill(0, 0.7);
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
            return (2.5 + n * 3) * ew;
        } else {
            let n = (index - 1) / 2;
            return (24.5 + n * 3) * ew;
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

                img.scale.set(this.c_width / og_w, this.c_height / og_h);
                let container = this.setupCharUI(index, img);
                container.position.set(offset, 0);

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
    removeChar(card: ICharacter, destroy_big: () => void) {
        for(let i = 0; i < this.list.length; i++) {
            if(this.list[i].isEqual(card)) {
                this.list[i] = null;
                this.chars_view.children[i].destroy();
                this.tired_mask_view.children[i].visible = false;
                break;
            }
        }
        if(destroy_big) {
            destroy_big();
        }
    }

    private setupCharUI(index: number, img: PIXI.Sprite) {
        let view = new PIXI.Container();
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
        this.ticker.add(fade_in);
        
        // 大圖
        img.interactive = true;
        img.cursor = "pointer";
        let destroy_big: () => void = null;
        img.on("mouseover", () => {
            destroy_big = this.showBigCard(
                img.worldTransform.tx +img.width/2,img.worldTransform.ty +img.height/2,
                char, this.ticker);
        });
        img.on("mouseout", () => {
            if(destroy_big) {
                destroy_big();
                destroy_big = null;
            }
        });
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
        // 角色退場
        char.card_leave_chain.append(() => {
            return {
                after_effect: () => {
                    this.removeChar(char, destroy_big);
                }
            };
        });
        // 角色進入場所或推進事件
        img.on("click", async evt => {
            if(this.selecter.selecting) {
                this.selecter.onCardClicked(char);
            } else if(this.gm.t_master.cur_player == this.player && !char.is_tired) {
                function guard(c: ICard): c is IEvent | IArena {
                    return TypeGaurd.isEvent(c) || TypeGaurd.isArena(c);
                }
                let c_selected = await this.selecter.selectSingleCard(char, guard, card => true);
                if(TypeGaurd.isCard(c_selected)) {
                    if(TypeGaurd.isArena(c_selected)) {
                        let result = await this.gm.enterArena(c_selected, char, true);
                        if(result) {
                            if(destroy_big) {
                                destroy_big();
                                destroy_big = null;
                            }
                            // 移除UI
                            view.visible = false;
                            tired_mask.visible = false;
                        }
                    } else if(TypeGaurd.isEvent(c_selected)) {
                        let result = await this.gm.getMyMaster(this.player).pushEvent(c_selected, char, true);
                        if(result) {
                            if(destroy_big) {
                                destroy_big();
                                destroy_big = null;
                            }
                        }
                    }
                }
            }
        });

        view.addChild(img);
        let s_area = drawStrength(this.gm, char, view.width * 0.6, true);
        s_area.view.position.set(img.width * 0.2, img.height - s_area.view.height / 2);
        view.addChild(s_area.view);

        // 角色行動或能力
        if(char.abilities.length != 0) {
            let circle = new PIXI.Graphics();
            circle.beginFill(0xffffff, 1);
            circle.lineStyle(2, 0);
            circle.drawCircle(0, 0, img.height / 8);
            circle.endFill();
            circle.interactive = true;
            circle.cursor = "pointer";
            circle.on("click", async evt => {
                evt.stopPropagation();
                // TODO: 支援多個角色行動
                await this.gm.getMyMaster(this.player).triggerAbility(char, 0, true);
            });
            view.addChild(circle);
        }
        this.selecter.registerCardObj(char, view);
        return view;
    }
}