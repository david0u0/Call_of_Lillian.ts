import * as Filters from "pixi-filters";
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

type Deck = {
    name: string,
    description: string,
    list: { name: string, count: number }[]
};
const DeckID = (() => {
    let url_params = new URL(window.location.href).searchParams;
    let _id = url_params.get("_id");
    if(_id) {
        return _id;
    } else {
        throw "無牌組id";
    }
})();
const { ew, eh } = getEltSize();

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
async function getDeck() {
    let res = await fetch(`/api/deck/detail?_id=${DeckID}`);
    if(res.ok) {
        let data = (await res.json()) as Deck;
        return data;
    }
    throw "找不到牌組";
}

const PAGE_LIMIT = 10;
function drawPage(index: number, gm: GameMaster, card_list: IKnownCard[],
    showBigCard: ShowBigCard, onClick: (card: IKnownCard) => void,
    onHover: (card: IKnownCard, inside: boolean) => void
) {
    let view = new PIXI.Container();
    let cards = card_list.slice(PAGE_LIMIT * index, PAGE_LIMIT * (index + 1));
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
                        onHover(card, true);
                        let destroy_big = showBigCard(card_ui.x + card_ui.width / 2,
                            card_ui.y + card_ui.height / 2, card);
                        cleanup_funcs[n] = () => {
                            onHover(card, false);
                            destroy_big();
                        };
                    });
                    card_ui.on("mouseout", () => {
                        onHover(card, false);
                        if(cleanup_funcs[n]) {
                            cleanup_funcs[n]();
                        }
                    });
                    card_ui.on("click", () => onClick(card));
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

class DeckUI {
    public view = new PIXI.Container();
    public get deck(): Deck {
        return {
            ...this._deck,
            list: this._deck.list.map(pair => {
                return { ...pair };
            })
        };
    }
    private card_table: { [name: string]: IKnownCard } = {};
    constructor(private _deck: Deck, cards: IKnownCard[]) {
        for(let c of cards) {
            this.card_table[c.name] = c;
        }
        this.refreshUI();
    }
    private width: number = null;
    setWidth(width: number) {
        this.width = width;
        this.refreshUI();
    }
    private cur_highlight = "";
    highlight(card: IKnownCard, high: boolean) {
        this.cur_highlight = high ? card.name : "";
        for(let [i, pair] of this._deck.list.entries()) {
            if(pair.name == card.name) {
                let rec = this.view.children[i];
                if(rec && rec.filters) {
                    this.view.children[i].filters[0].enabled = high;
                }
                break;
            }
        }
    }
    addCard(card: IKnownCard) {
        let found = false;
        for(let pair of this._deck.list) {
            if(pair.name == card.name) {
                found = true;
                if(card.deck_count >= pair.count + 1) {
                    pair.count++;
                    break;
                }
            }
        }
        if(!found) {
            this._deck.list.push({ name: card.name, count: 1});
        }
        this._deck.list = this._deck.list.sort((a, b) => {
            return this.card_table[a.name].basic_mana_cost - this.card_table[b.name].basic_mana_cost;
        });
        this.refreshUI();
    }
    refreshUI() {
        if(this.width) {
            for(let child of [...this.view.children]) {
                child.destroy();
            }
            for(let [i, pair] of this._deck.list.entries()) {
                this.drawPair(i, pair);
            }
        }
    }
    drawPair(index: number, pair: { name: string, count: number }) {
        const rec_h = 35;
        let rec = new PIXI.Graphics();
        rec.lineStyle(1, 0);
        rec.beginFill(0xffffff, 1);
        rec.drawRoundedRect(0, index * rec_h, this.width, rec_h, 5);
        rec.endFill();
        this.view.addChild(rec);
        let txt = new PIXI.Text(`${pair.name} x ${pair.count}`, new PIXI.TextStyle({
            fill: 0, fontSize: rec_h*0.6
        }));
        txt.position.set(0, index * rec_h);
        rec.addChild(txt);
        rec.filters = [new Filters.GlowFilter(20, 1, 2, 0x48e0cf, 0.5)];
        rec.filters[0].enabled = (this.cur_highlight == pair.name);

        rec.interactive = true;
        rec.cursor = "pointer";
        rec.on("click", () => {
            if(pair.count > 0) {
                pair.count--;
            }
            if(pair.count == 0) {
                this._deck.list = [...this._deck.list.slice(0, index), ...this._deck.list.slice(index+1)];
            }
            this.refreshUI();
        });
    }
}

async function setup() {
    let [all_card_list, deck] = await Promise.all([getAllCards(), getDeck()]);

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
    let bg = new PIXI.Sprite(PIXI.loader.resources["background"].texture);
    let ratio = width / bg.width;
    bg.scale.set(ratio);
    app.stage.addChild(bg);

    let deck_ui = new DeckUI(deck, cards);
    app.stage.addChild(deck_ui.view);

    let index = 0;
    let { view, destroy } = await drawPage(0, gm, cards, show_big_card,
        c => deck_ui.addCard(c), (c, inside) => deck_ui.highlight(c, inside));
    let loading = false;
    app.stage.addChild(view);

    document.addEventListener("wheel", async evt => {
        if(loading) {
            return;
        }
        let sign = evt.wheelDelta > 0 ? -1 : 1;
        index += sign;
        if(index < 0) {
            index = 0;
        } else if(index > Math.floor(cards.length / PAGE_LIMIT)) {
            index = Math.floor(cards.length / PAGE_LIMIT);
        } else {
            loading = true;
            destroy();
            ({ view, destroy } = await drawPage(index, gm, cards, show_big_card,
                c => deck_ui.addCard(c), (c, inside) => deck_ui.highlight(c, inside)));
            app.stage.addChild(view);
            loading = false;
        }
    });
    let left_space = width - view.width;
    deck_ui.setWidth(left_space * 0.8);
    deck_ui.view.position.set(view.width + left_space * 0.1, 0);

}

document.body.appendChild(app.view);