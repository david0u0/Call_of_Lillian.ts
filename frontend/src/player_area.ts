import * as PIXI from "pixi.js";
import { getEltSize } from "./get_screen_size";

let W = 40, H = 50;
let { ew, eh } = getEltSize();

export function drawPlayerArea(width: number, height: number, ticker: PIXI.ticker.Ticker, menu=false) {
    let container = new PIXI.Container();
    let avatar = new PIXI.Sprite(PIXI.loader.resources["avatar"].texture);
    let og_w = avatar.width, og_h = avatar.height;
    let ratio = Math.min(width / W, height / H);
    [width, height] = [ratio * W, ratio * H];
    avatar.scale.set(ratio * W / og_w, ratio * H / og_h);
    container.addChild(avatar);

    if(menu) {
        let add_symbol = drawAddSymbol(ticker);
        container.addChild(add_symbol);
    }

    return { container, width, height };
}

function drawAddSymbol(ticker: PIXI.ticker.Ticker) {
    let symbol = new PIXI.Container();
    let add = new PIXI.Text("+", new PIXI.TextStyle({
        "fontSize": ew,
        "fill": 0xffffff,
        "fontWeight": "bold"
    }));
    add.anchor.set(0.5, 0.5);
    symbol.addChild(add);

    let circle = new PIXI.Graphics();
    circle.lineStyle(4, 0xffffff);
    circle.drawCircle(0, 0, ew/2.2);
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
    let res = drawMoreMenu(expand);
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

function drawMoreMenu(expand: (close?: boolean) => boolean) {
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

    container.addChild(drawIcon("incite", 0, expand));
    container.addChild(drawIcon("war", 1, expand));
    container.addChild(drawIcon("release", 2, expand));
    container.addChild(drawIcon("rest", 3, expand));


    return { container, getHovering };
}

function drawIcon(name: string, index: number, expand: (close?: boolean) => boolean) {
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
            alert(name);
        }
    });
    return icon;
}