import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { UnknownCard } from "../../game_core/cards";
import { UnknownCardUI } from "./card_ui";
import { Player } from "../../game_core/enums";
import getEltSize from "./get_elemental_size";
import { drawHands } from "./draw_hand_cards";
import { drawPlayerArea } from "./draw_player_area";

import C from "../../game_core/test/real_card/character/見習魔女";
import C2 from "../../game_core/test/real_card/character/終末之民";

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
.add("incite", require("../assets/incite.png"))
.add("war", require("../assets/war.png"))
.load(setup);


async function setup() {
    let gm = new GameMaster();
    let card_image_loader = new PIXI.loaders.Loader();

    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    app.stage.addChild(bg);

    let hands = Array(8).fill(0).map(() => {
        if(Math.random() > 0.5) {
            return new C2(1, Player.Player1, gm);
        } else {
            return new C(1, Player.Player1, gm);
        }
    });
    let hands_ui1 = await drawHands(hands, app.ticker, card_image_loader);
    let hands_ui2 = await drawHands(hands, app.ticker, card_image_loader);
    hands_ui2.position.set(0, getWinSize().height - hands_ui2.height);
    app.stage.addChild(hands_ui1);
    app.stage.addChild(hands_ui2);

    let player_area1 = drawPlayerArea(4*ew, 6*eh, app.ticker).container;
    let result = drawPlayerArea(4*ew, 6*eh, app.ticker);
    let [player_area2, height] = [result.container, result.height];
    player_area1.x = ew * 18;
    app.stage.addChild(player_area1);
    player_area2.position.set(ew*18, getWinSize().height - height);
    app.stage.addChild(player_area1);
    app.stage.addChild(player_area2);
}

document.body.appendChild(app.view);