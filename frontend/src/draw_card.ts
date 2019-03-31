import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd as TG } from "../../game_core/interface";

const H = 1000, W = 722;
function titleStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width/15,
        fontWeight: "bold",
        fill: 0,
        fontFamily: "微軟正黑體"
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

function scaleImage(img: PIXI.Sprite, width: number, height: number) {
    let ratio = Math.min(width / W, height / H);
    let og_w = img.width;
    let og_h = img.height;
    img.scale.set(ratio * W / og_w, ratio * H / og_h);
}

export function drawCard(card: ICard, width: number, height: number,
    loader: PIXI.loaders.Loader, isbig=false
) {
    let img: PIXI.Sprite;
    if(TG.isKnown(card)) {
        img = new PIXI.Sprite(loader.resources[card.name].texture);
    } else {
        img = new PIXI.Sprite(PIXI.loader.resources["card_back"].texture);
    }
    scaleImage(img, width, height);
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
            title_rec.drawRoundedRect(width/15, width/12, width*13/15, width/10, 5);
            title_rec.endFill();
            let name_txt = new PIXI.Text(card.name, titleStyle(width));
            name_txt.position.set(width/15 * 1.5, width/12);
            container.addChild(title_rec);
            container.addChild(name_txt);
            let mana_txt = new PIXI.Text(card.basic_mana_cost.toString(), manaStyle(width));
            let mana_pop_img = new PIXI.Sprite(PIXI.loader.resources["mana_pop"].texture);
            mana_pop_img.scale.set(width/7/mana_pop_img.width);
            mana_pop_img.position.set(width/8, -width/10);
            mana_txt.anchor.set(-0.5, 0);
            mana_txt.position.set(width/8, -width/10);
            mana_txt.alpha = 0.8;
            container.addChild(mana_pop_img);
            container.addChild(mana_txt);
            container.pivot.set(0, -width/10);

            if(isbig) {
                let description_rec = new PIXI.Graphics();
                description_rec.lineStyle(1, 0);
                description_rec.beginFill(0xffffff, 1);
                description_rec.drawRoundedRect(width / 15, height * 3 / 5, width * 13 / 15, height * 11 / 30, 5);
                description_rec.endFill();
                let description_txt = new PIXI.Text(card.description, descrStyle(width));
                description_txt.position.set(width/15*1.3, height * 3 / 5);
                container.addChild(description_rec);
                container.addChild(description_txt);
            }

            if(TG.isSpell(card)) {

            } else if(TG.isCharacter(card) || TG.isUpgrade(card)) {

            }
        }
    }

    return container;
}
