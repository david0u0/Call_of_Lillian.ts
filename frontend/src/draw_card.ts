import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd as TG, ICharacter, IUpgrade, TypeGaurd } from "../../game_core/interface";
import { my_loader } from "./card_loader";
import { GameMaster } from "../../game_core/master/game_master";
import { Player } from "../../game_core/enums";
import { PlayerMaster } from "../../game_core/master/player_master";

const H = 1000, W = 722;
function titleStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width / 15,
        fontWeight: "bold",
        fill: 0,
        fontFamily: "微軟正黑體",

        wordWrapWidth: width * 3 / 5
    });
}
function manaStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width / 8,
        fill: 0,
        fontFamily: "微軟正黑體",
    });
}
function descrStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width / 16,
        fill: 0,
        fontFamily: "微軟正黑體",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: width * 13 / 16
    });
}

export function getCardSize(width: number, height: number, landscape = false) {
    if(landscape) {
        let ratio = Math.min(width / H, height / W);
        return { width: ratio * H, height: ratio * W };
    } else {
        let ratio = Math.min(width / W, height / H);
        return { width: ratio * W, height: ratio * H };
    }
}

export function drawCardFace(card: ICard|string, width: number, height: number, landscape = false) {
    let img: PIXI.Sprite;
    if(typeof(card) == "string") {
        img = new PIXI.Sprite(my_loader.resources[card].texture);
    } else if(TG.isKnown(card)) {
        img = new PIXI.Sprite(my_loader.resources[card.name].texture);
    } else {
        img = new PIXI.Sprite(PIXI.loader.resources["card_back"].texture);
    }
    let res = getCardSize(width, height, landscape);
    let og_w = img.width;
    let og_h = img.height;
    img.scale.set(res.width / og_w, res.height / og_h);
    return img;
}

export function drawUpgradeCount(pm: PlayerMaster , card: ICharacter, size: number) {
    let view = new PIXI.Container();
    let img = new PIXI.Sprite(PIXI.loader.resources["upgrade_pop"].texture);
    img.height = img.width = size;
    img.anchor.set(0.5, 0.5);
    let txt = new PIXI.Text("", new PIXI.TextStyle({
        fontSize: size*0.6
    }));
    txt.anchor.set(0.5, 0.5);
    let updateTxt = () => {
        if(card.upgrade_list.length > 0) {
            txt.text = card.upgrade_list.length.toString();
            view.visible = true;
        } else {
            view.visible = false;
        }
    };
    pm.card_play_chain.append(() => {
        return { after_effect: updateTxt };
    });
    updateTxt();
    view.addChild(img);
    view.addChild(txt);
    return view;
}
export function drawStrength(gm: GameMaster, card: ICharacter | IUpgrade, s_width: number, need_upate=false) {
    let pm = gm.getMyMaster(card);
    let s_height = s_width * 0.4;
    let view = new PIXI.Container();

    let s_area = new PIXI.Graphics();
    if(pm.player == Player.Player1) {
        s_area.lineStyle(2, 0x48e0cf);
        s_area.beginFill(0xdefdf9, 2);
    } else {
        s_area.lineStyle(2, 0xf86390);
        s_area.beginFill(0xfcb6cb, 2);
    }
    s_area.drawRoundedRect(0, 0, s_width, s_height, s_height/2);
    //s_area.drawEllipse(s_width/2, s_height/2, s_width/2, s_height/2);
    s_area.endFill();
    view.addChild(s_area);

    let s_txt = new PIXI.Text("", new PIXI.TextStyle({
        fontSize: s_height * 0.7,
    }));
    s_txt.dirty = true;
    s_txt.anchor.set(0.5, 0.5);
    s_txt.position.set(s_width / 2, s_height / 2);
    view.addChild(s_txt);
    let formatStr = () => {
        let str = 0;
        if(TypeGaurd.isCharacter(card)) {
            str = pm.getStrength(card);
        } else {
            str = card.basic_strength;
        }
        if(str != card.basic_strength) {
            s_txt.style.fill = 0x0f70d2;
        }
        s_txt.text = str.toString();
    };
    formatStr();
    // 在任何牌被打出時更新戰力
    // TODO: 應該要在 getter 鏈上接一個回調，在該鏈被動到的時候通知我
    let destroy: () => void = null;
    if(need_upate) {
        let hook = pm.card_play_chain.append(c => {
            return { after_effect: formatStr };
        });
        destroy = () => { hook.active_countdown = 0; };
    }

    return { view, destroy };
}

export function drawCard(gm: GameMaster, card: ICard, width: number, height: number, isbig = false) {
    let img: PIXI.Sprite;
    let container = new PIXI.Container();
    if(!TG.isKnown(card)) {
        img = drawCardFace(card, height, width);
        container.addChild(img);
    } else {
        if(TG.isArena(card) || TG.isEvent(card)) {
            img = drawCardFace(card, height, width, true);
            width = img.height;
            height = img.width;
            img.rotation = Math.PI / 2;
            img.x = width;
            if(TG.isArena) {

            } else {

            }
        } else {
            img = drawCardFace(card, width, height);
            ({ width, height } = img);
        }
        container.addChild(img);

        let title_rec = new PIXI.Graphics();
        title_rec.lineStyle(1, 0);
        title_rec.beginFill(0xffffff, 1);
        title_rec.drawRoundedRect(width / 15, width / 12, width * 13 / 15, width / 10, 5);
        title_rec.endFill();
        let name_txt = new PIXI.Text(truncateName(card.name, title_rec.width), titleStyle(width));
        name_txt.position.set(width / 15 * 1.5, width / 12);
        container.addChild(title_rec);
        container.addChild(name_txt);
        let mana_txt = new PIXI.Text(card.basic_mana_cost.toString(), manaStyle(width));
        let mana_pop_img = new PIXI.Sprite(PIXI.loader.resources["mana_pop"].texture);
        mana_pop_img.scale.set(width / 7 / mana_pop_img.width);
        mana_pop_img.position.set(width / 8, -width / 10);
        mana_txt.anchor.set(-0.5, 0);
        mana_txt.position.set(width / 8, -width / 10);
        mana_txt.alpha = 0.8;
        container.addChild(mana_pop_img);
        container.addChild(mana_txt);

        if(isbig) {
            let description_rec = new PIXI.Graphics();
            description_rec.lineStyle(1, 0);
            description_rec.beginFill(0xffffff, 1);
            description_rec.drawRoundedRect(width / 15, height * 3 / 5, width * 13 / 15, height * 11 / 30, 5);
            description_rec.endFill();
            let description_txt = new PIXI.Text(card.description, descrStyle(width));
            description_txt.position.set(width / 15 * 1.3, height * 3 / 5);
            container.addChild(description_rec);
            container.addChild(description_txt);
        }

        if(TG.isCharacter(card) || TG.isUpgrade(card)) {
            if(isbig) {
                let s_area = drawStrength(gm, card, width * 0.4);
                container.addChild(s_area.view);
                s_area.view.position.set(width * 0.3, height - s_area.view.height / 2);
            }
        } else if(TG.isEvent(card)) {
            let goal_txt = new PIXI.Text(card.goal_progress_count.toString(), manaStyle(width));
            let goal_pop_img = new PIXI.Sprite(PIXI.loader.resources["goal_pop"].texture);
            goal_pop_img.scale.set(width / 7 / goal_pop_img.width);
            goal_pop_img.position.set(width / 8 * 2, -width / 10);
            goal_txt.anchor.set(-0.5, 0);
            goal_txt.position.set(width / 8 * 2, -width / 10);
            goal_txt.alpha = 0.8;
            container.addChild(goal_pop_img);
            container.addChild(goal_txt);
            let countdown_txt = new PIXI.Text(card.init_time_count.toString(), manaStyle(width));
            let countdown_pop_img = new PIXI.Sprite(PIXI.loader.resources["countdown_pop"].texture);
            countdown_pop_img.scale.set(width / 7 / countdown_pop_img.width);
            countdown_pop_img.position.set(width / 8 * 3, -width / 10);
            countdown_txt.anchor.set(-0.5, 0);
            countdown_txt.position.set(width / 8 * 3, -width / 10);
            countdown_txt.alpha = 0.8;
            container.addChild(countdown_pop_img);
            container.addChild(countdown_txt);
            let score_txt = new PIXI.Text(card.score.toString(), manaStyle(width));
            let score_pop_img = new PIXI.Sprite(PIXI.loader.resources["score_pop"].texture);
            score_pop_img.scale.set(width / 7 / score_pop_img.width);
            score_pop_img.position.set(width / 8 * 4, -width / 10);
            score_txt.anchor.set(-0.5, 0);
            score_txt.position.set(width / 8 * 4, -width / 10);
            score_txt.alpha = 0.8;
            container.addChild(score_pop_img);
            container.addChild(score_txt);
        }
    }

    container.pivot.set(0, -width / 10);
    return container;
}

function truncateName(name: string, width: number) {
    return name.slice(0, width / 14);
}