import * as PIXI from "pixi.js";
import * as Filters from "pixi-filters";

import { getEltSize, getPlayerColor } from "./get_constant";
import { Player, CardStat } from "../../game_core/enums";
import FS from "./frontend_selecter";
import { TypeGaurd as TG, IArena, buildConfig } from "../../game_core/interface";
import { GameMaster } from "../../game_core/master/game_master";
import { PlayerMaster } from "../../game_core/master/player_master";

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

export function drawPlayerArea(gm: GameMaster, pm: PlayerMaster, selecter: FS, width: number, height: number,
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
    pm.set_mana_chain.appendDefault(() => {
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
    pm.set_emo_chain.appendDefault(() => {
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

    let filter = new Filters.GlowFilter(20, 1, 2, getPlayerColor(pm.player, true), 0.5);
    avatar.filters = [filter];
    gm.t_master.start_turn_chain.appendDefault(({ prev, next }) => {
        return {
            after_effect: () => {
                if(next == pm.player) {
                    avatar.alpha = 1;
                    filter.enabled = true;
                } else {
                    avatar.alpha = 0.6;
                    filter.enabled = false;
                }
            }
        };
    });

    let rest_txt = new PIXI.Text("休息中zzz", labelStyle(0.15 * height));
    rest_txt.anchor.set(1, 1);
    rest_txt.x = width;
    rest_txt.alpha = 0;
    container.addChild(rest_txt);
    gm.t_master.rest_state_change_chain.appendDefault(({ player, resting }) => {
        if(player == pm.player) {
            rest_txt.alpha = resting ? 1 : 0;
        }
    });

    if(upsidedown) {
        mana_label_txt.position.set(0.2 * width, 0.6 * height);
        mana_txt.position.set(0.2 * width, 0.6 * height + mana_label_txt.height);
        emo_label_txt.position.set(0.8 * width, 0.6 * height);
        emo_txt.position.set(0.8 * width, 0.6 * height + mana_label_txt.height);
        rest_txt.position.set(width, height);
    }

    let add_symbol = drawAddSymbol(gm, pm.player, selecter, 0.2 * height, ticker);
    add_symbol.x = 0.2 * width;
    container.addChild(add_symbol);
    if(upsidedown) {
        add_symbol.y = height;
    }
    return { container, width, height };
}

function drawAddSymbol(gm: GameMaster, player: Player, selecter: FS, size: number, ticker: PIXI.ticker.Ticker) {
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

    let fade_in_out = () => {
        new Promise<void>(resolve => {
            if(menu.alpha <= 0.8 && expanding) {
                menu.alpha += 0.1;
                symbol.alpha = 0;
                menu.y -= 1;
            } else if(menu.alpha > 0 && !expanding) {
                menu.alpha -= 0.1;
                symbol.alpha += 0.1;
                menu.y += 1;
            } else {
                ticker.remove(fade_in_out);
                resolve();
            }
        });
    };
    let close = async () => {
        expanding = false;
        menu.cursor = "normal";
        symbol.cursor = "pointer";
        window.removeEventListener("mousedown", blur_handler);
        await ticker.add(fade_in_out);
        menu.visible = false;
    };

    let getHovering: () => boolean;
    let blur_handler = () => {
        if(!hovering && !getHovering()) {
            close();
        }
    };

    let expanding = false;
    let res = drawMoreMenu(gm, player, selecter, close);
    let menu = res.container;
    menu.visible = false;
    menu.alpha = 0;
    getHovering = res.getHovering;
    symbol.addChild(menu);

    symbol.on("click", () => {
        if(!expanding) {
            menu.visible = true;
            expanding = true;
            menu.cursor = "pointer";
            symbol.cursor = "normal";
            window.addEventListener("mousedown", blur_handler);
            ticker.add(fade_in_out);
        }
    });

    let container = new PIXI.Container();
    container.addChild(symbol);
    container.addChild(menu);
    return container;
}

function drawMoreMenu(gm: GameMaster, player: Player, selecter: FS, close: () => void) {
    let { eh, ew } = getEltSize();
    let container = new PIXI.Container();
    let rec = new PIXI.Graphics();
    rec.beginFill(0xFFFFFF, 1);
    rec.drawRoundedRect(0, 0, eh*9, eh*2.5, 5);
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

    for(let [i, label] of ["incite", "war", "release"].entries()) {
        let func = (() => {
            if(label == "incite") {
                return async (x: number, y: number) => {
                    selecter.setInitPos(x, y);
                    let char = await selecter.selectCard(player, null, buildConfig({
                        guard: TG.isCharacter,
                        owner: 1-player,
                    }));
                    if(char) {
                        await gm.getMyMaster(char).incite(char, player, true);
                    }
                };
            } else if(label == "war") {
                return async (x: number, y: number) => {
                    selecter.setInitPos(x, y);
                    let arena = await selecter.selectCard(player, null, buildConfig({
                        guard: TG.isArena,
                        check: a => gm.w_master.checkCanDeclare(player, a)
                    }));
                    if(arena) {
                        await gm.w_master.declareWar(player, arena, true);
                    }
                };
            } else {
                return async (x: number, y: number) => {
                    selecter.setInitPos(x, y);
                    let char = await selecter.selectCard(player, null, buildConfig({
                        guard: TG.isCharacter,
                        owner: player,
                    }));
                    if(char) {
                        await gm.getMyMaster(char).release(char, true);
                    }
                };
            }
        })();
        container.addChild(drawIcon(label, i, close, func));
    }

    return { container, getHovering };
}

function drawIcon(name: string, index: number,
    close: () => void, action: (x: number, y:number) => Promise<void>
) {
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
    icon.on("click", async evt => {
        await action(evt.data.global.x, evt.data.global.y);
        close();
    });
    return icon;
}