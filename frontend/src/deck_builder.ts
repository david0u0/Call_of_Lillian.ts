import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/master/game_master";
import { Character, KnownCard } from "../../game_core/cards";
import { Player } from "../../game_core/enums";

import { getWinSize, getEltSize } from "./get_constant";
import { ShowBigCard, showBigCard } from "./show_big_card";
import { ICard } from "../../game_core/interface";
import FrontendSelecter from "./frontend_selecter";
import generateCard from "./generate_card";

let app = new PIXI.Application(getWinSize());

PIXI.loader
.add("background", require("../assets/background.png"))
.add("card_back", require("../assets/card_back.png"))
.add("mana_pop", require("../assets/mana_pop.png"))
.add("goal_pop", require("../assets/goal_pop.png"))
.add("countdown_pop", require("../assets/countdown_pop.png"))
.add("score_pop", require("../assets/score_pop.png"))
.add("goal_prompt", require("../assets/goal_prompt.png"))
.add("countdown_prompt", require("../assets/countdown_prompt.png"))
.load(setup);

async function setup() {
    let me = Player.Player1;
    let { width, height } = getWinSize();
    let selecter = new FrontendSelecter(me, app.ticker);
    let gm = new GameMaster(selecter, generateCard);

    let show_big_card: ShowBigCard = (x: number, y: number, card: ICard,
        conf?: { width: number, height: number, alpha: number, description?: boolean }
    ) => {
        return showBigCard(gm, app.stage, x, y, card, app.ticker, conf);
    };
}

document.body.appendChild(app.view);