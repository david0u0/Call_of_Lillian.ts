import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/master/game_master";
import { Character, KnownCard } from "../../game_core/cards";
import { Player } from "../../game_core/enums";

import { getWinSize, getEltSize } from "./get_constant";
import { constructHandUI } from "./hand_cards";
import { drawPlayerArea } from "./player_area";

import { showBigCard, ShowBigCard } from "./show_big_card";
import { ICard, IKnownCard } from "../../game_core/interface";
import initiateGame from "../../game_core/initiate_game";
import { CharArea } from "./char_area";
import { ArenaArea } from "./arena_area";
import FrontendSelecter from "./frontend_selecter";
import generateCard from "./generate_card";
import { EventArea } from "./event_area";
import { PhaseNotifier } from "./phase_notifier";
import { FrontendWarMaster } from "./frontend_war_master";
import { SearchViewer } from "./search_viewer";

let app = new PIXI.Application(getWinSize());
async function initGameWithServer(gm: GameMaster) {
    let res = await fetch("/api/game/decks");
    if(res.ok) {
        let data = await res.json();
        let { info1, info2, mode } = data;
        await initiateGame(gm, info1, info2, mode);
    } else {
        throw "找不到牌組";
    }
}

PIXI.loader
.add("background", require("../assets/background.png"))
.add("card_back", require("../assets/card_back.png"))
.add("avatar", require("../assets/avatar.jpg"))
.add("incite", require("../assets/incite.png"))
.add("war", require("../assets/war.png"))
.add("release", require("../assets/release.png"))
.add("mana_pop", require("../assets/mana_pop.png"))
.add("goal_pop", require("../assets/goal_pop.png"))
.add("countdown_pop", require("../assets/countdown_pop.png"))
.add("score_pop", require("../assets/score_pop.png"))
.add("ability", require("../assets/ability.png"))
.add("upgrade_pop", require("../assets/upgrade_pop.png"))
.add("goal_prompt", require("../assets/goal_prompt.png"))
.add("countdown_prompt", require("../assets/countdown_prompt.png"))
.load(setup);

class ConcreatSearchViewer extends SearchViewer {
    private bg = new PIXI.Graphics();
    constructor(gm: GameMaster, showBigCard: ShowBigCard, width: number, height: number) {
        super(gm, showBigCard, width, height);
        this.view.addChildAt(this.bg, 0);
    }
    drawBG(color: number, alpha: number) {
        this.bg.clear();
        this.bg.beginFill(color, alpha);
        this.bg.drawRoundedRect(0, 0, this.view.width, this.view.height, 5);
    }
}

async function setup() {
    let me = Player.Player1;
    let { width, height } = getWinSize();
    let { ew, eh } = getEltSize();
    let selecter = new FrontendSelecter(me);
    let gm = new GameMaster(selecter, generateCard);

    let show_big_card: ShowBigCard = (x: number, y: number, card: ICard,
        conf?: { width: number, height: number, alpha: number, description?: boolean }
    ) => {
        return showBigCard(gm, app.stage, x, y, card, app.ticker, conf);
    };
    let search_viewer = new ConcreatSearchViewer(gm, show_big_card, ew * 30, eh * 35);
    search_viewer.drawBG(0xffffff, 0.7);
    search_viewer.view.pivot.set(search_viewer.view.width / 2, search_viewer.view.height / 2);
    search_viewer.view.position.set(ew * 21, eh * 21);
    selecter.setSearchViewer(search_viewer);

    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    let ratio = Math.max(width / bg.width, height / bg.height);
    bg.scale.set(ratio);

    app.stage.addChild(bg);
    app.stage.addChild(selecter.cancel_view);
    let f_w_master = new FrontendWarMaster(me, gm, selecter);

    let p_area1 = drawPlayerArea(gm, gm.getEnemyMaster(me), selecter, 6*ew, 10*eh, app.ticker, true);
    let p_area2 = drawPlayerArea(gm, gm.getMyMaster(me), selecter, 6*ew, 10*eh, app.ticker);
    p_area1.container.position.set((width-p_area1.width)/2, 11*eh-p_area1.height);
    p_area2.container.position.set((width-p_area2.width)/2, 31*eh);

    let char_area1 = new CharArea(1-me, gm, selecter, show_big_card, app.ticker);
    char_area1.view.position.set(0, 13.5*eh - char_area1.view.height);
    let char_area2 = new CharArea(me, gm, selecter, show_big_card, app.ticker);
    char_area2.view.position.set(0, 28.5*eh);

    let event_area1 = new EventArea(1-me, gm, selecter, show_big_card, app.ticker);
    event_area1.search_viewer = search_viewer;
    event_area1.view.position.set(36.5*ew, 20.8*eh-event_area1.view.height);
    let event_area2 = new EventArea(me, gm, selecter, show_big_card, app.ticker);
    event_area2.search_viewer = search_viewer;
    event_area2.view.position.set(36.5*ew, 21.2*eh);

    let phase_notifier = new PhaseNotifier(gm, me, selecter, app.ticker);

    let arena_area1 = new ArenaArea(1-me, gm, selecter, app.ticker, show_big_card, f_w_master);
    let arena_area2 = new ArenaArea(me, gm, selecter, app.ticker, show_big_card, f_w_master);

    await initGameWithServer(gm);

    arena_area1.view.position.set(0, 20.25*eh - arena_area1.view.height);
    arena_area2.view.position.set(0, 21.75*eh);

    app.stage.addChild(arena_area1.view);
    app.stage.addChild(arena_area2.view);
    
    app.stage.addChild(event_area1.view);
    app.stage.addChild(event_area2.view);

    app.stage.addChild(char_area1.view);
    app.stage.addChild(char_area2.view);

    app.stage.addChild(p_area1.container);
    app.stage.addChild(p_area2.container);

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
    app.stage.addChild(f_w_master.view);
    app.stage.addChild(phase_notifier.view);
    app.stage.addChild(search_viewer.view);
    app.stage.addChild(selecter.view);
    app.stage.addChild(selecter.prompt_txt);
}

document.body.appendChild(app.view);