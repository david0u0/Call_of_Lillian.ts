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
import { C4 } from "../../game_core/test/real_card/character/數據之海的水手";
import { U_Test0 } from "../../game_core/test/real_card/upgrade/u_test0";

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
    let hands2 = Array(10).fill(0).map(() => {
        let n = Math.random();
        let CurClass;
        if(n < 0.2) {
            CurClass = C;
        } else if(n < 0.4) {
            CurClass = C2;
        } else if(n < 0.6) {
            CurClass = C4;
        } else if(n < 0.8) {
            CurClass = C3;
        } else {
            CurClass = U_Test0;
        }
        return gm.genCardToHand(Player.Player1, (seq, owner, gm) => {
            return new CurClass(seq, owner, gm);
        });
    });

    let show_big_card: ShowBigCard = (x: number, y: number,
        card: ICard, ticker: PIXI.ticker.Ticker
    ) => {
        return showBigCard(gm, app.stage, x, y, card, ticker);
    };

    let hands_ui1_obj = await constructHandUI(selecter, gm, hands1, app.ticker,
        show_big_card, c => {
            return { x: (width - c.width) / 2, y: -c.height + 5.5*eh };
        }
    );
    app.stage.addChild(hands_ui1_obj.view);
    let hands_ui2_obj = await constructHandUI(selecter, gm, hands2, app.ticker,
        show_big_card, c => {
            return { x: (width - c.width) / 2, y: height - 5.5*eh };
        }
    );
    let hands_ui1 = hands_ui1_obj.view;
    let hands_ui2 = hands_ui2_obj.view;

    let p_area1 = drawPlayerArea(gm.getEnemyMaster(me), 6*ew, 10*eh, app.ticker, true);
    let p_area2 = drawPlayerArea(gm.getMyMaster(me), 6*ew, 10*eh, app.ticker);
    p_area1.container.position.set((width-p_area1.width)/2, 11*eh-p_area1.height);
    p_area2.container.position.set((width-p_area2.width)/2, 31*eh);

    let char_area = new CharArea(me, gm, selecter, show_big_card, app.ticker);
    char_area.view.position.set(0, 28.5*eh);

    let arena_area1 = new ArenaArea(me, gm, selecter, app.ticker, show_big_card);
    let arena_area2 = new ArenaArea(1-me, gm, selecter, app.ticker, show_big_card);
    arena_area1.view.position.set(0, 21.75*eh);
    arena_area2.view.position.set(0, 20.25*eh - arena_area2.view.height);

    gm.getMyMaster(me).addMana(99);
    gm.getEnemyMaster(me).addMana(9);
    for(let i = 0; i < 5; i++) {
        let card = gm.genArenaToBoard(me, i, (seq, owner, gm) => {
            return new H(seq, owner, gm);
        });
        arena_area1.addArena(i, card);
        card = gm.genArenaToBoard(1-me, i, (seq, owner, gm) => {
            return new H(seq, owner, gm);
        });
        arena_area2.addArena(i, card);
    }

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