import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd as TG, ICharacter, IUpgrade, TypeGaurd } from "../../game_core/interface";
import { my_loader } from "./card_loader";
import { GameMaster } from "../../game_core/game_master";

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

export function drawStrength(gm: GameMaster, card: ICharacter | IUpgrade, s_width: number, need_upate=false) {
    let pm = gm.getMyMaster(card);
    let s_height = s_width * 0.4;
    let view = new PIXI.Container();

    let s_area = new PIXI.Graphics();
    s_area.lineStyle(2, 0x48e0cf);
    s_area.beginFill(0xdefdf9, 2);
    s_area.drawRoundedRect(0, 0, s_width, s_height, s_height);
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
        container.pivot.set(0, -width / 10);

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

        if(TG.isSpell(card)) {

        } else if(TG.isCharacter(card) || TG.isUpgrade(card)) {
            if(isbig) {
                let s_area = drawStrength(gm, card, width * 0.4); // 大圖不需要實時更新戰力
                container.addChild(s_area.view);
                s_area.view.position.set(width * 0.3, height - s_area.view.height / 2);
            }
        }

    }

    return container;
}

function truncateName(name: string, width: number) {
    return name.slice(0, width / 14);
}