import * as PIXI from "pixi.js";
import { getEltSize } from "./get_constant";
import { drawCard, drawCardFace } from "./draw_card";
import { my_loader } from "./card_loader";
import { Player, CardStat } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter, { SelectState } from "./frontend_selecter";
import { ShowBigCard } from "./show_big_card";
import { IKnownCard, IEvent, TypeGaurd } from "../../game_core/interface";

let { ew, eh } = getEltSize();
let W = 5.5 * ew;

export class EventArea {
    public readonly view = new PIXI.Container();
    public readonly event_view = new PIXI.Container();
    private list = new Array<IEvent>();
    private finish_list = new Array<IEvent>();
    constructor(private player: Player, private gm: GameMaster, private selecter: FrontendSelecter,
        private showBigCard: ShowBigCard, private ticker: PIXI.ticker.Ticker
    ) {
        let mask = new PIXI.Graphics();
        mask.beginFill(0, 0.5);
        mask.drawRoundedRect(0, 0, 5.5 * ew, 15 * eh, 5);
        mask.endFill();
        this.view.addChild(mask);

        let pm = gm.getMyMaster(player);
        pm.set_to_board_chain.appendDefault(card => {
            if(TypeGaurd.isEvent(card)) {
                return { after_effect: async () => await this.addEvent(card) };
            }
        });

        let score_icon = this.drawTotalScore(eh*2);
        score_icon.position.set(-score_icon.width/2, score_icon.height/2);
        this.view.addChild(score_icon);
        this.view.addChild(this.event_view);
    }
    addEvent(card: IEvent): Promise<void> {
        return new Promise<void>(resolve => {
            my_loader.add(card.name).load(() => {
                this.addEventLoaded(card);
                resolve();
            });
        });
    }
    private addEventLoaded(card: IEvent) {
        let evt_ui = new PIXI.Container();

        let index = this.list.length;
        this.list.push(card);

        let card_face = drawCardFace(card, 2.5 * ew, 4 * eh, true);
        card_face.x = (W - card_face.width) / 2;

        let push_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: ew * 0.8,
            fill: 0xffffff
        }));

        push_txt.anchor.set(1, 0.5);
        push_txt.position.set(card_face.x, card_face.height / 4);

        let push_img = new PIXI.Sprite(PIXI.loader.resources["goal_prompt"].texture);
        push_img.anchor.set(0.5, 0.5);
        push_img.scale.set(0.8 * ew / push_img.width);
        push_img.alpha = 0.8;

        let updateProgressUI = () => {
            push_txt.text = `${card.cur_progress_count}/${card.goal_progress_count}`;
            push_img.position.set(push_txt.x - push_txt.width/2, push_txt.y);
        };
        let countdown_texture = PIXI.loader.resources["countdown_prompt"].texture;
        let countdown_area = new PIXI.Container();
        countdown_area.x = card_face.x + card_face.width;
        let size = (W - card_face.width - card_face.x) / 3.2;
        let updateCountdownUI = () => {
            for(let img of [...countdown_area.children]) {
                img.destroy();
            }
            let count = card.cur_time_count;
            let [rest, n_ver] = [count % 3, Math.floor(count / 3)];
            let draw_img = (i: number, j: number) => {
                let img = new PIXI.Sprite(countdown_texture);
                img.width = img.height = size;
                img.position.x = j * size;
                img.position.y = i * size;
                countdown_area.addChild(img);
            };
            for(let i = 0; i < n_ver; i++) {
                for(let j = 0; j < 3; j++) {
                    draw_img(i, j);
                }
            }
            for(let j = 0; j < rest; j++) {
                draw_img(n_ver, j);
            }
        };
        updateProgressUI();
        updateCountdownUI();
        card.add_progress_chain.append(() => {
            return {
                after_effect: () => updateProgressUI()
            };
        }, () => card.card_status == CardStat.Onboard);
        card.add_countdown_chain.append(() => {
            return {
                after_effect: () => updateCountdownUI()
            };
        }, () => card.card_status == CardStat.Onboard);

        card.finish_chain.appendDefault(() => {
            return { after_effect: () => this.finishEvent(card, destroy_big) };
        });
        card.card_leave_chain.appendDefault(() => {
            return { after_effect: () => this.removeEvent(card, destroy_big) };
        });

        card_face.interactive = true;
        card_face.cursor = "pointer";
        card_face.on("click", () => {
            if(this.selecter.selecting == SelectState.Card) {
                this.selecter.onCardClicked(card);
            } else {
                // NOTE: 沒事應該不會去點事件卡 吧？
            }
        });
        let destroy_big: () => void = null;
        card_face.on("mouseover", () => {
            destroy_big = this.showBigCard(
                card_face.worldTransform.tx + card_face.width / 2,
                card_face.worldTransform.ty + card_face.height / 2, card);
        });
        card_face.on("mouseout", () => {
            if(destroy_big) {
                destroy_big();
            }
        });

        evt_ui.addChild(push_img);
        evt_ui.addChild(card_face);
        evt_ui.addChild(push_txt);
        evt_ui.addChild(countdown_area);
        evt_ui.y = 0.7 * evt_ui.height * index;
        this.event_view.addChild(evt_ui);
    }
    finishEvent(event: IEvent, destroy_big: () => void) {
        this.removeEvent(event, destroy_big);
        this.finish_list.push(event);
        // TODO: 在完成區的事件也有可能退場
    }
    removeEvent(event: IEvent, destroy_big: () => void) {
        for(let i = 0; i < this.list.length; i++) {
            if(this.list[i].isEqual(event)) {
                this.event_view.children[i].destroy();
                this.list = [...this.list.slice(0, i), ...this.list.slice(i+1)];
                break;
            }
        }
        if(destroy_big) {
            destroy_big();
        }
    }
    drawTotalScore(size: number) {
        let icon = new PIXI.Container();
        let bg = new PIXI.Sprite(PIXI.loader.resources["score_pop"].texture);
        let pm = this.gm.getMyMaster(this.player);
        bg.width = bg.height = size;
        let txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: size
        }));
        let updateScore = () => {
            txt.text = pm.getScore().toString();
        };
        updateScore();
        this.gm.acf.setAfterEffect(() => {
            updateScore();
        });
        txt.x = (size-txt.width)/2;
        txt.y = (size-txt.height)/2;
        icon.addChild(bg);
        icon.addChild(txt);

        icon.interactive = true;
        icon.cursor = "pointer";
        // TODO: 打開一個新的視窗檢視完成的任務

        return icon;
    }
}