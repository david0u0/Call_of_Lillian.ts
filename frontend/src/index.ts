import { GameMaster } from "../../game_core/game_master";
import * as PIXI from "pixi.js";

function getWinSize() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    return { width, height };
}

function getEltSize() {
    let ew = window.innerWidth/42;
    let eh = window.innerHeight/42;
    return { ew, eh };
}

//Create the renderer
let app = new PIXI.Application(getWinSize());

PIXI.loader
.add("background", require("../assets/background.jpg")).load(setup);


function setup() {
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    app.stage.addChild(bg);
    bg.filters = [new PIXI.filters.BlurFilter(100)];
    let login_block = getLoginBlock();
    app.stage.addChild(login_block);
}
function getLoginBlock() {
    let container = new PIXI.Container();
    let { ew, eh } = getEltSize();

    let rec = new PIXI.Graphics();
    rec.beginFill(0);
    rec.drawRoundedRect(0, 0, 22*ew, 22*eh, 10);
    container.addChild(rec);

    let message = new PIXI.Text("你好，守護者！", new PIXI.TextStyle({
        fontSize: Math.min(ew, eh) * 2,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        fill: 0xFFFFFF
    }));
    message.anchor.set(0.5, 0);
    message.position.set(11*ew, eh);
    container.addChild(message);

    let message_name = new PIXI.Text("帳號", new PIXI.TextStyle({
        fontSize: Math.min(ew, eh)*1.2,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        fill: 0xFFFFFF
    }));
    message_name.position.set(4*ew, 5*eh);
    container.addChild(message_name);
    let message_pass = new PIXI.Text("密碼", new PIXI.TextStyle({
        fontSize: Math.min(ew, eh)*1.2,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        fill: 0xFFFFFF
    }));
    message_pass.position.set(4*ew, 11*eh);
    container.addChild(message_pass);

    let btn1 = getButton(2*ew, 2*eh, "登入");
    btn1.position.set(19*ew, 19*eh);
    let btn2 = getButton(2*ew, 2*eh, "註冊");
    btn2.position.set(16*ew, 19*eh);
    container.addChild(btn1);
    container.addChild(btn2);

    let mouse_hover = false;
    container.alpha = 0.75;
    container.interactive = true;
    container.on("mouseover", () => {
        mouse_hover = true;
    });
    container.on("mouseout", () => {
        mouse_hover = false;
    });
    app.ticker.add(() => {
        if(mouse_hover && container.alpha <= 0.9) {
            container.alpha += 0.02;
        } else if(!mouse_hover && container.alpha >= 0.75) {
            container.alpha -= 0.02;
        }
    });

    container.position.set(10*ew, 10*eh);
    return container;
}

function getButton(width: number, height: number, message: string) {
    let container = new PIXI.Container();
    container.interactive = true;

    /*let rec = new PIXI.Graphics();
    rec.beginFill(color);
    rec.drawRoundedRect(0, 0, width, height, 3);
    container.addChild(rec);*/

    let style = new PIXI.TextStyle({
        fontSize: Math.min(height, width) * 0.7,
        fontFamily: "微軟正黑體",
        fontWeight: "bold",
        textBaseline: "",
        fill: 0xFFFFFF
    });
    let txt = new PIXI.Text(message, style);
    txt.anchor.set(0.5, 0.5);
    txt.position.set(width/2, height/2);
    container.addChild(txt);

    let line = new PIXI.Graphics();
    line.lineStyle(2, 0xFFFFFF);
    line.moveTo(width*0.1, height);
    line.lineTo(width*0.9, height);
    container.addChild(line);
    line.alpha = 0;
    container.on("mouseover", () => {
        line.alpha = 1;
    });
    container.on("mouseout", () => {
        line.alpha = 0;
    });

    container.cursor = "pointer";
    return container;
}

document.body.appendChild(app.view);