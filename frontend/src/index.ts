import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { UnknownCard } from "../../game_core/cards";
import { Player } from "../../game_core/enums";
import getEltSize from "./get_elemental_size";
import { drawHands } from "./hand_cards";
import { drawPlayerArea } from "./player_area";

import C from "../../game_core/test/real_card/character/見習魔女";
import C2 from "../../game_core/test/real_card/character/終末之民";
import C3 from "../../game_core/test/real_card/character/雨季的魔女．語霽";
import { showBigCard, ShowBigCard } from "./show_big_card";
import { ICard } from "../../game_core/interface";

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
.add("release", require("../assets/release.png"))
.add("rest", require("../assets/rest.png"))
.add("mana_pop", require("../assets/mana_pop.png"))
.load(setup);


async function setup() {
    let { width, height } = getWinSize();
    let gm = new GameMaster();
    let card_image_loader = new PIXI.loaders.Loader();

    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);

    app.stage.addChild(bg);
    
    let hands1 = Array(5).fill(0).map(() => {
        return new UnknownCard(1, Player.Player2);
    });
    let hands2 = Array(9).fill(0).map(() => {
        let n = Math.random();
        if(n < 0.2) {
            return new C2(1, Player.Player1, gm);
        } else if(n < 0.5) {
            return new C(1, Player.Player1, gm);
        } else {
            return new C3(1, Player.Player1, gm);
        }
    });

    let show_big_card: ShowBigCard = (x: number, y: number, card: ICard, 
        ticker: PIXI.ticker.Ticker, loader: PIXI.loaders.Loader
    ) => {
        return showBigCard(app.stage, x, y, card, ticker, loader);
    };

    let hands_ui1 = await drawHands(hands1, app.ticker, card_image_loader, show_big_card);
    let hands_ui2 = await drawHands(hands2, app.ticker, card_image_loader, show_big_card);
    hands_ui1.position.set((width-hands_ui1.width)/2, -hands_ui1.height*0.4);
    hands_ui2.position.set((width-hands_ui2.width)/2, height - hands_ui2.height*0.6);

    let area1 = drawPlayerArea(4*ew, 6*eh, app.ticker);
    let area2 = drawPlayerArea(4*ew, 6*eh, app.ticker, true);
    area1.container.position.set((width-area1.width)/2, hands_ui2.height*0.5);
    area2.container.position.set((width-area2.width)/2, height - area2.height - hands_ui2.height*0.5);

    app.stage.addChild(area1.container);
    app.stage.addChild(area2.container);
    app.stage.addChild(hands_ui1);
    app.stage.addChild(hands_ui2);
}

document.body.appendChild(app.view);