import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/master/game_master";
import { Character, KnownCard } from "../../game_core/cards";
import { Player } from "../../game_core/enums";

import { getWinSize, getEltSize } from "./get_constant";
import { ShowBigCard, showBigCard } from "./show_big_card";
import { ICard, IKnownCard } from "../../game_core/interface";
import FrontendSelecter from "./frontend_selecter";
import generateCard from "./generate_card";
import { drawCard, getCardSize } from "./draw_card";
import { my_loader } from "./card_loader";

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

async function getAllCards(): Promise<string[]> {
    let res = await fetch("/api/card/list");
    if(res.ok) {
        let data = await res.json();
        if(data instanceof Array) {
            return data;
        }
    }
    throw "找不到卡表";
}

const PAGE_LIMIT = 10;
function drawPage(index: number, gm: GameMaster,
    card_list: IKnownCard[], showBigCard: ShowBigCard
) {
    let view = new PIXI.Container();
    let cards = card_list.slice(PAGE_LIMIT * index, PAGE_LIMIT * (index + 1));
    let { ew, eh } = getEltSize();
    let { width, height } = getCardSize(ew * 6, eh * 18.5);
    for(let c of cards) {
        my_loader.add(c);
    }
    return new Promise<{ view: PIXI.Container, destroy: () => void }>(resolve => {
        my_loader.load(() => {
            let cleanup_funcs = new Array<() => void>();
            for(let i = 0; i < 2; i++) {
                for(let j = 0; j < 5; j++) {
                    let n = i * 5 + j;
                    let card = cards[n];
                    if(!card) {
                        break;
                    }
                    let card_ui = drawCard(gm, card, width, height, true);
                    card_ui.position.set(ew * 7 * j, eh * 20 * i);
                    card_ui.addChild(card_ui);
                    card_ui.interactive = true;
                    card_ui.cursor = "pointer";
                    cleanup_funcs.push(null);
                    card_ui.on("mouseover", () => {
                        cleanup_funcs[n] = showBigCard(card_ui.x + card_ui.width / 2,
                            card_ui.y + card_ui.height / 2, card);
                    });
                    card_ui.on("mouseout", () => {
                        if(cleanup_funcs[n]) {
                            cleanup_funcs[n]();
                        }
                        cleanup_funcs[n] = null;
                    });
                    view.addChild(card_ui);
                }
            }
            let destroy = () => {
                for(let f of cleanup_funcs) {
                    if(f) {
                        f();
                    }
                    view.destroy();
                }
            };
            resolve({ view, destroy });
        });
    });
}

async function setup() {
    let all_card_list = await getAllCards();

    let me = Player.Player1;
    let { width, height } = getWinSize();
    let selecter = new FrontendSelecter(me, app.ticker);
    let gm = new GameMaster(selecter, generateCard);
    let cards = all_card_list.map(name => {
        try {
            return generateCard(name, Player.Player1, -1, gm);
        } catch(e) {
            return null;
        }
    }).filter(card => card && card.deck_count > 0)
    .sort((a, b) => a.basic_mana_cost - b.basic_mana_cost);

    let show_big_card: ShowBigCard = (x: number, y: number, card: ICard,
        conf?: { width: number, height: number, alpha: number, description?: boolean }
    ) => {
        return showBigCard(gm, app.stage, x, y, card, app.ticker, conf);
    };
    let { ew, eh } = getEltSize();
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    let ratio = width / bg.width;
    bg.scale.set(ratio);
    app.stage.addChild(bg);

    let index = 0;
    let { view, destroy } = await drawPage(0, gm, cards, show_big_card);
    app.stage.addChild(view);

    document.addEventListener("wheel", async evt => {
        let sign = evt.wheelDelta > 0 ? -1 : 1;
        index += sign;
        if(index < 0) {
            index = 0;
        } else if(index > Math.floor(cards.length / PAGE_LIMIT)) {
            index = Math.floor(cards.length / PAGE_LIMIT);
        } else {
            destroy();
            ({ view, destroy } = await drawPage(index, gm, cards, show_big_card));
            app.stage.addChild(view);
        }
    });
}

document.body.appendChild(app.view);