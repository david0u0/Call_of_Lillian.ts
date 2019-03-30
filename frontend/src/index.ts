import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { UnknownCard } from "../../game_core/cards";
import { UnknownCardUI } from "./card_ui";
import { Player } from "../../game_core/enums";
import getEltSize from "./get_elemental_size";
import { drawHands } from "./draw_hand_cards";

function getWinSize() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    return { width, height };
}

//Create the renderer
let app = new PIXI.Application(getWinSize());

PIXI.loader
.add("background", require("../assets/background.jpg"))
.add("card_back", require("../assets/card_back.png"))
.add("avatar", require("../assets/avatar.jpg"))
.load(setup);


function setup() {
    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    let hands = Array(8).fill(0).map(() => {
        return new UnknownCard(1, Player.Player1);
    });
    let hands_ui = drawHands(hands, app.ticker);
    app.stage.addChild(bg);
    app.stage.addChild(hands_ui);
}

document.body.appendChild(app.view);