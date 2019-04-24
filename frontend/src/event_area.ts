import * as PIXI from "pixi.js";
import { getEltSize } from "./get_constant";
import { drawCard, drawCardFace } from "./draw_card";
import { my_loader } from "./card_loader";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter, { SelectState } from "./frontend_selecter";
import { ShowBigCard } from "./show_big_card";
import { IKnownCard, IEvent, TypeGaurd } from "../../game_core/interface";

export class EventArea {
    public readonly view = new PIXI.Container();
    public readonly event_view = new PIXI.Container();
    private list = new Array<IEvent>();
    private finish_list = new Array<IEvent>();
    constructor(private player: Player, private gm: GameMaster, private selecter: FrontendSelecter,
        private showBigCard: ShowBigCard, private ticker: PIXI.ticker.Ticker
    ) {
        let { ew, eh } = getEltSize();
        let mask = new PIXI.Graphics();
        mask.beginFill(0, 0.5);
        mask.drawRoundedRect(0, 0, 5.5 * ew, 15 * eh, 5);
        mask.endFill();
        this.view.addChild(mask);

        let pm = gm.getMyMaster(player);
        pm.add_card_chain.append(card => {
            if(TypeGaurd.isEvent(card)) {
                return { after_effect: () => this.addEvent(card) };
            }
        });

        let score_icon = this.drawTotalScore(eh*2);
        score_icon.position.set(-score_icon.width/2, score_icon.height/2);
        this.view.addChild(score_icon);
        this.view.addChild(this.event_view);
    }
    addEvent(card: IEvent) {
        let { ew, eh } = getEltSize();
        let evt_ui = new PIXI.Container();

        let index = this.list.length;
        this.list.push(card);

        let card_face = drawCardFace(card, 2.5 * ew, 4 * eh, true);
        let push_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: ew * 0.8,
            fill: 0xffffff
        }));
        let countdown_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: ew * 0.8,
            fill: 0xffffff
        }));
        let updateTxt = () => {
            push_txt.text = `${card.cur_progress_count}/${card.goal_progress_count}`;
            countdown_txt.text = card.cur_time_count.toString();
        };
        updateTxt();
        card.push_chain.append(() => {
            return { after_effect: updateTxt };
        });
        this.gm.t_master.start_building_chain.append(() => {
            return { after_effect: updateTxt };
        });
        let destroy_big: () => void = null;
        card.finish_chain.append(() => {
            return { after_effect: () => this.finishEvent(card, destroy_big) };
        });
        card.card_leave_chain.append(() => {
            return { after_effect: () => this.removeEvent(card, destroy_big) };
        });

        card_face.x = (5.5 * ew - card_face.width) / 2;
        push_txt.anchor.set(1, 0.5);
        push_txt.position.set(card_face.x, card_face.height / 4);
        countdown_txt.anchor.set(0, 0.5);
        countdown_txt.position.set(card_face.width + card_face.x, card_face.height / 4);
        evt_ui.addChild(card_face);
        evt_ui.addChild(push_txt);
        evt_ui.addChild(countdown_txt);

        card_face.interactive = true;
        card_face.cursor = "pointer";
        card_face.on("click", () => {
            if(this.selecter.selecting == SelectState.Card) {
                this.selecter.onCardClicked(card);
            } else {
                // NOTE: 沒事應該不會去點事件卡 吧？
            }
        });
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
        pm.finish_chain.append(() => {
            return { after_effect: updateScore };
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