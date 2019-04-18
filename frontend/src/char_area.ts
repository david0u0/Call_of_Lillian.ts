import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";
import { my_loader } from "./card_loader";
import { ShowBigCard } from "./show_big_card";
import { BadOperationError } from "../../game_core/errors";
import { TypeGaurd, ICharacter, IEvent, IArena, ICard } from "../../game_core/interface";
import { Player } from "../../game_core/enums";
import { CharUI } from "./draw_card";
import FrontendSelecter from "./frontend_selecter";
import { GameMaster } from "../../game_core/master/game_master";

const H = 70, W = 50, MAX_CHAR = 9;

export class CharArea {
    public view = new PIXI.Container();

    private list: ICharacter[] = new Array(MAX_CHAR).fill(null);
    private readonly c_width: number;
    private readonly c_height: number;

    constructor(private player: Player, private gm: GameMaster, private selecter: FrontendSelecter,
        private showBigCard: ShowBigCard, private ticker: PIXI.ticker.Ticker
    ) {
        let { ew, eh } = getEltSize();
        let ratio = Math.min(ew * 2.5 / W, eh * 7 / H);
        this.c_width = ratio * W;
        this.c_height = ratio * H;

        let dummy = new PIXI.Graphics();
        dummy.beginFill(0, 0.7);
        dummy.drawRect(0, 0, 42*ew, this.c_height);
        dummy.endFill();
        dummy.alpha = 0;
        this.view.addChild(dummy);

        // 向主持人註冊事件
        this.gm.getMyMaster(player).add_char_chain.append(card => {
            return { after_effect: () => this.addChar(card) };
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

    async addChar(char: ICharacter, index?: number): Promise<void> {
        if(typeof index == "number") {
            if(this.list[index]) {
                throw new BadOperationError("嘗試將角色加入至有人的位置！");
            } else if(index >= MAX_CHAR) {
                throw new BadOperationError("嘗試加入超過上限的角色！");
            }
            this.list[index] = char;
            let offset = this.getOffset(index);
            let char_ui = await CharUI.create(char, this.c_width, this.c_height,
                this.gm, this.ticker, this.showBigCard);
            char_ui.view.position.set(offset, 0);
            this.view.addChild(char_ui.view);
            this.setupCharUI(char_ui, index);
        } else {
            let i = 0;
            for(i = 0; i < MAX_CHAR; i++) {
                if(!this.list[i]) {
                    break;
                }
            }
            return this.addChar(char, i);
        }
    }

    private setupCharUI(char_ui: CharUI, index: number) {
        let char = char_ui.char;
        // 角色離開場面（不論退場還是放逐）
        char.card_leave_chain.append(() => {
            return {
                after_effect: async () => {
                    char_ui.destroy();
                    this.list[index] = null;
                }
            };
        });
        // 角色回到場邊
        this.gm.getMyMaster(this.player).exit_chain.append(arg => {
            if(arg.char.isEqual(char)) {
                char_ui.show();
                this.selecter.registerCardObj(char, char_ui.view);
            }
        });
        // 角色進入場所或推進事件
        char_ui.setOnclick(async evt => {
            if(this.selecter.selecting) {
                this.selecter.onCardClicked(char);
            } else if(this.gm.t_master.cur_player == this.player && !char.is_tired) {
                function guard(c: ICard): c is IEvent | IArena {
                    return TypeGaurd.isEvent(c) || TypeGaurd.isArena(c);
                }
                let c_selected = await this.selecter.selectCard(this.player, char, guard, card => true);
                if(TypeGaurd.isCard(c_selected)) {
                    if(TypeGaurd.isArena(c_selected)) {
                        let result = await this.gm.getMyMaster(this.player)
                        .enterArena(c_selected, char, true);
                        if(result) {
                            // 隱藏UI
                            char_ui.hide();
                        }
                    } else if(TypeGaurd.isEvent(c_selected)) {
                        await this.gm.getMyMaster(this.player).pushEvent(c_selected, char, true);
                    }
                }
            }
        });
        this.selecter.registerCardObj(char, char_ui.view);
    }
}