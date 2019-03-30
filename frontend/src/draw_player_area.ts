import * as PIXI from "pixi.js";
import getEltSize from "./get_elemental_size";

let W = 100, H = 100;
let { ew, eh } = getEltSize();

export function drawPlayerArea(width: number, height: number, ticker: PIXI.ticker.Ticker) {
    let container = new PIXI.Container();
    let avatar = new PIXI.Sprite(PIXI.loader.resources["avatar"].texture);
    let og_w = avatar.width, og_h = avatar.height;
    let ratio = Math.min(width / W, height / H);
    [width, height] = [ratio * W, ratio * H];
    avatar.scale.set(ratio * W / og_w, ratio * H / og_h);
    container.addChild(avatar);

    let add_symbol = drawAddSymbol(ticker);
    container.addChild(add_symbol);

    return { container, width, height };
}

function drawAddSymbol(ticker: PIXI.ticker.Ticker) {
    let symbol = new PIXI.Container();
    let add = new PIXI.Text("+", new PIXI.TextStyle({
        "fontSize": ew,
        "fill": 0xffffff
    }));
    add.anchor.set(0.5, 0.5);
    symbol.addChild(add);

    let circle = new PIXI.Graphics();
    circle.lineStyle(2, 0xffffff);
    circle.drawCircle(0, 0, ew/2.2);
    symbol.addChild(circle);

    symbol.interactive = true;
    symbol.cursor = "pointer";

    let menu = drawMoreMenu();
    symbol.addChild(menu);

    let hovering = false;
    symbol.on("mouseover", () => {
        hovering = true;
    });
    symbol.on("mouseout", () => {
        hovering = false;
    });
    let expanding = false;
    let blur_handler = () => {
        if(!hovering) {
            expanding = false;
            menu.cursor = "normal";
            symbol.cursor = "pointer";
            window.removeEventListener("mousedown", blur_handler);
        }
    };
    symbol.on("click", () => {
        if(!expanding) {
            expanding = true;
            menu.cursor = "pointer";
            symbol.cursor = "normal";
            window.addEventListener("mousedown", blur_handler);
        }
    });
    ticker.add(() => {
        if(menu.alpha <= 0.7 && expanding) {
            menu.alpha += 0.1;
            symbol.alpha = 0;
        } else if(menu.alpha > 0 && !expanding) {
            menu.alpha -= 0.1;
            symbol.alpha += 0.1;
        }
    });

    let container = new PIXI.Container();
    container.addChild(symbol);
    container.addChild(menu);
    return container;
}

function drawMoreMenu() {
    let container = new PIXI.Container();
    let rec = new PIXI.Graphics();
    rec.beginFill(0xFFFFFF, 1);
    rec.drawRoundedRect(0, 0, ew*7, eh*2.5, 3);
    rec.endFill();
    rec.position.set(-ew*2, -eh*3);
    container.addChild(rec);

    let incite = new PIXI.Sprite(PIXI.loader.resources["incite"].texture);
    incite.scale.set(eh*2.5/incite.height);
    container.addChild(incite);
    incite.position.set(-ew*2, -eh*3);

    container.interactive = true;

    return container;
}