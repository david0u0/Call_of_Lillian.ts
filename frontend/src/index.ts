import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/game_master";
import { UnknownCard, Character, KnownCard } from "../../game_core/cards";
import { Player } from "../../game_core/enums";
import TestSelecter from "../../game_core/test_selecter";

import { getWinSize, getEltSize } from "./get_screen_size";
import { constructHandUI } from "./hand_cards";
import { drawPlayerArea } from "./player_area";

import C from "../../game_core/test/real_card/character/見習魔女";
import C2 from "../../game_core/test/real_card/character/終末之民";
import C3 from "../../game_core/test/real_card/character/雨季的魔女．語霽";
import H from "../../game_core/test/real_card/arena/M市立綜合醫院";

import { showBigCard, ShowBigCard } from "./show_big_card";
import { ICard, ICharacter } from "../../game_core/interface";
import { CharArea } from "./char_area";
import { ArenaArea } from "./arena_area";
import FrontendSelecter from "./frontend_selecter";

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
    let me = Player.Player1;
    let { width, height } = getWinSize();
    let selecter = new FrontendSelecter(app.ticker);
    let gm = new GameMaster(selecter);

    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);

    app.stage.addChild(bg);
    
    let hands1 = Array(5).fill(0).map((a, b) => {
        return new UnknownCard(b, Player.Player2);
    });
    let hands2 = Array(9).fill(0).map(() => {
        let n = Math.random();
        let CurClass;
        if(n < 0.5) {
            CurClass = C;
        } else {
            CurClass = C2;
        }
        return gm.genCardToHand(Player.Player1, (seq, owner, gm) => {
            return new CurClass(seq, owner, gm);
        });
    });

    let show_big_card: ShowBigCard = (x: number, y: number,
        card: ICard, ticker: PIXI.ticker.Ticker
    ) => {
        return showBigCard(app.stage, x, y, card, ticker);
    };

    let hands_ui1_obj = await constructHandUI(gm, hands1, app.ticker,
        show_big_card, c => {
            return { x: (width - c.width) / 2, y: -c.height * 0.5 };
        }
    );
    app.stage.addChild(hands_ui1_obj.view);
    let hands_ui2_obj = await constructHandUI(gm, hands2, app.ticker,
        show_big_card, c => {
            return { x: (width - c.width) / 2, y: height - c.height * 0.5 };
        }
    );
    let hands_ui1 = hands_ui1_obj.view;
    let hands_ui2 = hands_ui2_obj.view;

    let p_area1 = drawPlayerArea(4*ew, 10*eh, app.ticker);
    let p_area2 = drawPlayerArea(4*ew, 10*eh, app.ticker, true);
    p_area1.container.position.set((width-p_area1.width)/2, hands_ui2.height*0.2);
    p_area2.container.position.set((width-p_area2.width)/2, height - p_area2.height - hands_ui2.height*0.2);

    let char_area = new CharArea(me, gm, selecter, show_big_card, app.ticker);
    char_area.view.position.set(0, 29*eh);

    let arena_area1 = new ArenaArea(selecter);
    let arena_area2 = new ArenaArea(selecter);
    arena_area1.view.position.set(0, 21.75*eh);
    arena_area2.view.position.set(0, 20.25*eh - arena_area2.view.height);
    let card = gm.genArenaToBoard(me, 2, (seq, owner, gm) => {
        return new H(seq, owner, gm);
    });
    arena_area1.addArena(2, card);

    app.stage.addChild(char_area.view);

    app.stage.addChild(arena_area1.view);
    app.stage.addChild(arena_area2.view);

    app.stage.addChild(p_area1.container);
    app.stage.addChild(p_area2.container);
    app.stage.addChild(hands_ui1);
    app.stage.addChild(hands_ui2);
    app.stage.addChild(selecter.view);
}

document.body.appendChild(app.view);