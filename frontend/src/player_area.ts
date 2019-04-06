import * as PIXI from "pixi.js";
import { PlayerMaster, GameMaster } from "../../game_core/game_master";
import { getEltSize } from "./get_screen_size";
import { Player } from "../../game_core/enums";

let W = 60, H = 50;

function numericStyle(size: number) {
    return new PIXI.TextStyle({
        fontSize: size,
        fontWeight: "bold",
        fill: 0xebade6,
        strokeThickness: 2
    });
}
function labelStyle(size: number) {
    return new PIXI.TextStyle({
        fontSize: size*0.8,
        fontWeight: "bold",
        fontFamily: "微軟正黑體",
        fill: 0xebade6,
        strokeThickness: 2
    });
}

export function drawPlayerArea(gm: GameMaster, pm: PlayerMaster, width: number, height: number,
    ticker: PIXI.ticker.Ticker, upsidedown=false
) {
    let container = new PIXI.Container();
    let avatar = new PIXI.Sprite(PIXI.loader.resources["avatar"].texture);
    let og_w = avatar.width, og_h = avatar.height;
    let ratio = Math.min(width / W, height / H);
    [width, height] = [ratio * W, ratio * H];
    avatar.scale.set(ratio * W / og_w * 0.6, ratio * H / og_h);
    avatar.x = 0.2*width;
    container.addChild(avatar);

    let mana_label_txt = new PIXI.Text("魔力", labelStyle(0.2*height));
    let mana_txt = new PIXI.Text(pm.mana.toString(), numericStyle(0.2*height));
    pm.set_mana_chain.append(() => {
        return {
            after_effect: () => { mana_txt.text = pm.mana.toString(); }
        };
    });
    mana_txt.anchor.set(0.5, 0.5);
    mana_label_txt.anchor.set(0.5, 0.5);
    mana_label_txt.position.set(0.2*width, 0.25*height);
    mana_txt.position.set(0.2*width, 0.25*height + mana_label_txt.height);
    container.addChild(mana_label_txt);
    container.addChild(mana_txt);

    let emo_label_txt = new PIXI.Text("情緒", labelStyle(0.2*height));
    let emo_txt = new PIXI.Text(pm.emo.toString(), numericStyle(0.2*height));
    pm.set_emo_chain.append(() => {
        return {
            after_effect: () => { emo_txt.text = pm.emo.toString(); }
        };
    });
    emo_txt.anchor.set(0.5, 0.5);
    emo_label_txt.anchor.set(0.5, 0.5);
    emo_label_txt.position.set(0.8*width, 0.25*height);
    emo_txt.position.set(0.8*width, 0.25*height + mana_label_txt.height);
    container.addChild(emo_label_txt);
    container.addChild(emo_txt);

    let round_txt = new PIXI.Text("輪到你囉^Q^", labelStyle(0.15 * height));
    round_txt.anchor.set(1, 1);
    round_txt.x = width;
    round_txt.alpha = 0;
    container.addChild(round_txt);
    gm.t_master.start_turn_chain.append(({ prev, next }) => {
        return {
            after_effect: () => {
                if(next == pm.player) {
                    round_txt.alpha = 1;
                } else {
                    round_txt.alpha = 0;
                }
            }
        };
    });

    let rest_txt = new PIXI.Text("休息中zzz", labelStyle(0.15 * height));
    rest_txt.anchor.set(1, 1);
    rest_txt.x = width;
    rest_txt.alpha = 0;
    container.addChild(rest_txt);
    gm.t_master.rest_chain.append(({ player, resting }) => {
        return {
            after_effect: () => {
                if(player == pm.player) {
                    if(resting) {
                        rest_txt.alpha = 1;
                    } else {
                        rest_txt.alpha = 0;
                    }
                }
            }
        };
    });

    if(upsidedown) {
        mana_label_txt.position.set(0.2 * width, 0.6 * height);
        mana_txt.position.set(0.2 * width, 0.6 * height + mana_label_txt.height);
        emo_label_txt.position.set(0.8 * width, 0.6 * height);
        emo_txt.position.set(0.8 * width, 0.6 * height + mana_label_txt.height);
        round_txt.position.set(width, height);
        rest_txt.position.set(width, height);
    }


    let add_symbol = drawAddSymbol(gm, pm.player, 0.2 * height, ticker);
    add_symbol.x = 0.2 * width;
    container.addChild(add_symbol);
    if(upsidedown) {
        add_symbol.y = height;
    }
    return { container, width, height };
}

function drawAddSymbol(gm: GameMaster, player: Player, size: number, ticker: PIXI.ticker.Ticker) {
    let symbol = new PIXI.Container();
    let add = new PIXI.Text("+", new PIXI.TextStyle({
        "fontSize": size,
        "fill": 0xffffff,
        "fontWeight": "bold"
    }));
    add.anchor.set(0.5, 0.5);
    symbol.addChild(add);

    let circle = new PIXI.Graphics();
    circle.lineStyle(4, 0xffffff);
    circle.drawCircle(0, 0, size/2);
    symbol.addChild(circle);

    symbol.interactive = true;
    symbol.cursor = "pointer";

    let hovering = false;
    symbol.on("mouseover", () => {
        hovering = true;
    });
    symbol.on("mouseout", () => {
        hovering = false;
    });

    let getHovering: () => boolean;
    let blur_handler = () => {
        if(!hovering && !getHovering()) {
            expanding = false;
            menu.cursor = "normal";
            symbol.cursor = "pointer";
            window.removeEventListener("mousedown", blur_handler);
        }
    };

    let expand = (close=false) => {
        if(close) {
            expanding = false;
            menu.cursor = "normal";
            symbol.cursor = "pointer";
            window.removeEventListener("mousedown", blur_handler);
        }
        return expanding;
    };

    let expanding = false;
    let res = drawMoreMenu(gm, player, expand);
    let menu = res.container;
    menu.alpha = 0;
    getHovering = res.getHovering;
    symbol.addChild(menu);

    symbol.on("click", () => {
        if(!expanding) {
            expanding = true;
            menu.cursor = "pointer";
            symbol.cursor = "normal";
            window.addEventListener("mousedown", blur_handler);
        }
    });

    // FIXME: 這邊的 ticker 永遠不會停！
    let fade_in_out = () => {
        if(menu.alpha <= 0.8 && expanding) {
            menu.alpha += 0.1;
            symbol.alpha = 0;
            menu.y -= 1;
        } else if(menu.alpha > 0 && !expanding) {
            menu.alpha -= 0.1;
            symbol.alpha += 0.1;
            menu.y += 1;
        }
    };
    ticker.add(fade_in_out);

    let container = new PIXI.Container();
    container.addChild(symbol);
    container.addChild(menu);
    return container;
}

function drawMoreMenu(gm: GameMaster, player: Player, expand: (close?: boolean) => boolean) {
    let { eh, ew } = getEltSize();
    let container = new PIXI.Container();
    let rec = new PIXI.Graphics();
    rec.beginFill(0xFFFFFF, 1);
    rec.drawRoundedRect(0, 0, eh*11.5, eh*2.5, 5);
    rec.endFill();
    rec.position.set(-eh*3, -eh*3);
    container.addChild(rec);
    container.interactive = true;

    let hovering = false;
    container.on("mouseover", () => {
        hovering = true;
    });
    container.on("mouseout", () => {
        hovering = false;
    });
    let getHovering = () => hovering;

    for(let [i, label] of ["incite", "war", "release", "rest"].entries()) {
        let func = (() => {
            if(label == "rest") {
                return () => gm.t_master.setRest(player, true, true);
            } else {
                return () => alert(label);
            }
        })();
        container.addChild(drawIcon(label, i, expand, func));
    }

    return { container, getHovering };
}

function drawIcon(name: string, index: number, expand: (close?: boolean) => boolean, action: () => void) {
    let { eh, ew } = getEltSize();
    let icon = new PIXI.Sprite(PIXI.loader.resources[name].texture);
    icon.interactive = true;
    icon.scale.set(eh*2.5/icon.height);
    icon.alpha = 0.8;
    icon.on("mouseover", () => {
        icon.alpha = 1;
    });
    icon.on("mouseout", () => {
        icon.alpha = 0.8;
    });
    icon.position.set(-eh*3 + eh*3*index, -eh*3);
    icon.on("click", () => {
        if(expand()) {
            expand(true);
            action();
        }
    });
    return icon;
}