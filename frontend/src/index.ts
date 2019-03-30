import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { UnknownCardUI } from "./card_ui";

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
.add("background", require("../assets/background.jpg"))
.add("card_back", require("../assets/card_back.png"))
.load(setup);


function setup() {
    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    let card = new UnknownCardUI(ew*2, ew*6, app.ticker);
    app.stage.addChild(bg);
    app.stage.addChild(card.container);
}

document.body.appendChild(app.view);