import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd as TG, ICharacter, IUpgrade } from "../../game_core/interface";
import { my_loader } from "./card_loader";

const H = 1000, W = 722;
function titleStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width/15,
        fontWeight: "bold",
        fill: 0,
        fontFamily: "微軟正黑體",
        
        wordWrapWidth: width * 3/5
    });
}
function manaStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width/8,
        fill: 0,
        fontFamily: "微軟正黑體",
    });
}
function descrStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width/16,
        fill: 0,
        fontFamily: "微軟正黑體",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: width * 13 / 16
    });
}

export function getCardSize(width: number, height: number, landscape=false) {
    if(landscape) {
        let ratio = Math.min(width / H, height / W);
        return { width: ratio * H, height: ratio * W };
    } else {
        let ratio = Math.min(width / W, height / H);
        return { width: ratio * W, height: ratio * H };
    }
}

export function drawCardFace(card: ICard, width: number, height: number, landscape=false) {
    let img: PIXI.Sprite;
    if(TG.isKnown(card)) {
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

export function drawStrength(card: ICharacter|IUpgrade, s_width: number) {
    let s_height = s_width * 0.4 ;

    let s_area = new PIXI.Graphics();
    s_area.lineStyle(2, 0x48e0cf);
    s_area.beginFill(0xdefdf9, 2);
    s_area.drawRoundedRect(0, 0, s_width, s_height, s_height);
    //s_area.drawEllipse(s_width/2, s_height/2, s_width/2, s_height/2);
    s_area.endFill();

    let s_txt = new PIXI.Text(card.basic_strength.toString(), new PIXI.TextStyle({
        fontSize: s_height*0.7,
    }));
    s_txt.anchor.set(0.5, 0.5);
    s_txt.position.set(s_width/2, s_height/2);

    let view = new PIXI.Container();
    view.addChild(s_area);
    view.addChild(s_txt);
    return view;
}

export function drawCard(card: ICard, width: number, height: number, isbig = false) {
    let img = drawCardFace(card, width, height);
    let container = new PIXI.Container();
    container.addChild(img);
    ({ width, height } = img);

    if(TG.isKnown(card)) {
        if(TG.isArena(card) || TG.isEvent(card)) {

        } else if(TG.isEvent(card)) {

        } else {
            let title_rec = new PIXI.Graphics();
            title_rec.lineStyle(1, 0);
            title_rec.beginFill(0xffffff, 1);
            title_rec.drawRoundedRect(width / 15, width / 12, width * 13 / 15, width / 10, 5);
            title_rec.endFill();
            let name_txt = new PIXI.Text(card.name, titleStyle(width));
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
                    let s_area = drawStrength(card, width*0.4);
                    container.addChild(s_area);
                    s_area.position.set(width*0.3, height - s_area.height/2);
                }
            }
        }
    }

    return container;
}
