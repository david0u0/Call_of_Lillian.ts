import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { Character, KnownCard } from "../../game_core/cards";
import { Player } from "../../game_core/enums";

import { getWinSize, getEltSize } from "./get_screen_size";
import { constructHandUI } from "./hand_cards";
import { drawPlayerArea } from "./player_area";

import { showBigCard, ShowBigCard } from "./show_big_card";
import { ICard, IKnownCard } from "../../game_core/interface";
import initiateGame from "../../game_core/initiate_game";
import { CharArea } from "./char_area";
import { ArenaArea } from "./arena_area";
import FrontendSelecter from "./frontend_selecter";
import generateCard from "./generate_card";
import { my_loader } from "./card_loader";
import { EventArea } from "./event_area";
import { PhaseNotifier } from "./phase_notifier";

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
.add("goal_pop", require("../assets/goal_pop.png"))
.add("countdown_pop", require("../assets/countdown_pop.png"))
.add("score_pop", require("../assets/score_pop.png"))
.add("ability", require("../assets/ability.png"))
.load(setup);

async function setup() {
    let me = Player.Player1;
    let { width, height } = getWinSize();
    let selecter = new FrontendSelecter(app.ticker);
    let gm = new GameMaster(selecter, generateCard);

    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);

    app.stage.addChild(bg);
    
    let show_big_card: ShowBigCard = (x: number, y: number,
        card: ICard, ticker: PIXI.ticker.Ticker
    ) => {
        return showBigCard(gm, app.stage, x, y, card, ticker);
    };

    let p_area1 = drawPlayerArea(gm, gm.getEnemyMaster(me), 6*ew, 10*eh, app.ticker, true);
    let p_area2 = drawPlayerArea(gm, gm.getMyMaster(me), 6*ew, 10*eh, app.ticker);
    p_area1.container.position.set((width-p_area1.width)/2, 11*eh-p_area1.height);
    p_area2.container.position.set((width-p_area2.width)/2, 31*eh);

    let char_area1 = new CharArea(1-me, gm, selecter, show_big_card, app.ticker);
    char_area1.view.position.set(0, 13.5*eh - char_area1.view.height);
    let char_area2 = new CharArea(me, gm, selecter, show_big_card, app.ticker);
    char_area2.view.position.set(0, 28.5*eh);

    let event_area1 = new EventArea(1-me, gm, selecter, show_big_card, app.ticker);
    event_area1.view.position.set(36.5*ew, 20.8*eh-event_area1.view.height);
    let event_area2 = new EventArea(me, gm, selecter, show_big_card, app.ticker);
    event_area2.view.position.set(36.5*ew, 21.2*eh);

    app.stage.addChild(event_area1.view);
    app.stage.addChild(event_area2.view);

    app.stage.addChild(char_area1.view);
    app.stage.addChild(char_area2.view);

    app.stage.addChild(p_area1.container);
    app.stage.addChild(p_area2.container);

    let phase_notifier = new PhaseNotifier(gm, me, app.ticker);

    let arena_area1 = new ArenaArea(1-me, gm, selecter, app.ticker, show_big_card);
    let arena_area2 = new ArenaArea(me, gm, selecter, app.ticker, show_big_card);

    await initiateGame(gm, [], []);

    arena_area1.view.position.set(0, 20.25*eh - arena_area1.view.height);
    arena_area2.view.position.set(0, 21.75*eh);

    app.stage.addChild(arena_area1.view);
    app.stage.addChild(arena_area2.view);

    let hands_ui1_obj = await constructHandUI(selecter, 1-me, gm, gm.getEnemyMaster(me).hand, app.ticker,
        show_big_card, c => {
            return { x: (width - c.width) / 2, y: -c.height + 5.5 * eh };
        }
    );
    let hands_ui2_obj = await constructHandUI(selecter, me, gm, gm.getMyMaster(me).hand, app.ticker,
        show_big_card, c => {
            return { x: (width - c.width) / 2, y: height - 5.5*eh };
        }
    );
    app.stage.addChild(hands_ui1_obj.view);
    app.stage.addChild(hands_ui2_obj.view);
    app.stage.addChild(selecter.view);
    app.stage.addChild(phase_notifier.view);
}

document.body.appendChild(app.view);