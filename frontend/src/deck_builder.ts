import * as Filters from "pixi-filters";
import * as PIXI from "pixi.js";

import { GameMaster } from "../../game_core/master/game_master";
import { Player } from "../../game_core/enums";

import { getWinSize, getEltSize } from "./get_constant";
import { ShowBigCard, showBigCard } from "./show_big_card";
import { ICard, IKnownCard, TypeGaurd } from "../../game_core/interface";
import FrontendSelecter from "./frontend_selecter";
import generateCard from "./generate_card";
import { drawCard, getCardSize } from "./draw_card";
import { my_loader } from "./card_loader";
import { SearchViewer } from "./search_viewer";

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
    list: { abs_name: string, count: number }[]
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

class DeckUI {
    public view = new PIXI.Container();
    private list_view = new PIXI.Container();
    private count_txt: PIXI.Text;
    private readonly offset_y = 3 * eh;
    public get deck(): Deck {
        return {
            ...this._deck,
            list: this._deck.list.map(pair => {
                return { ...pair };
            })
        };
    }
    private card_table: { [abs_name: string]: IKnownCard } = {};
    private _hovering = false;
    public get hovering() { return this._hovering; };

    constructor(private _deck: Deck, cards: IKnownCard[],
        private onHover: (c: IKnownCard | null) => void
    ) {
        for(let c of cards) {
            this.card_table[c.abs_name] = c;
        }
        this.list_view.interactive = true;
        this.list_view.on("mouseover", () => this._hovering = true);
        this.list_view.on("mouseout", () => {
            this._hovering = false;
            this.onHover(null);
        });
        this.view.addChild(this.list_view);
        this.list_view.position.set(0, this.offset_y);
        this.sortList();
        this.refreshUI();
    }
    scroll(sign: -1 | 1) {
        let new_y = this.list_view.y - sign * 30;
        if(new_y <= this.offset_y * 1.1
            && new_y > this.mask.height * 0.9 - this.list_view.height + this.offset_y
        ) {
            this.list_view.y = new_y;
        }
    }
    private width: number = null;
    private mask: PIXI.Graphics;
    setWidth(width: number) {
        this.width = width;
        this.mask = new PIXI.Graphics();
        this.mask.beginFill(0);
        this.mask.drawRect(0, this.offset_y, width * 1.1, eh * 31);
        this.mask.endFill();
        this.list_view.mask = this.mask;
        this.view.addChild(this.mask);

        let name_txt = new PIXI.Text(this._deck.name, new PIXI.TextStyle({
            fontSize: 1.5*eh,
            fill: 0
        }));
        this.count_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: 1.2*eh,
            fill: 0
        }));
        this.count_txt.anchor.set(1, 0);
        this.count_txt.position.set(width, 1.7 * eh);
        this.view.addChild(name_txt);
        this.view.addChild(this.count_txt);
        this.refreshUI();
    }
    private onChangeFunc = () => {};
    public setOnChange(func: () => void) {
        this.onChangeFunc = func;
    }
    private cur_highlight = "";
    highlight(card: IKnownCard, high: boolean) {
        this.cur_highlight = high ? card.abs_name : "";
        for(let [i, pair] of this._deck.list.entries()) {
            if(pair.abs_name == card.abs_name) {
                let rec = this.list_view.children[i];
                if(rec && rec.filters) {
                    this.list_view.children[i].filters[0].enabled = high;
                }
                break;
            }
        }
    }
    addCard(card: IKnownCard) {
        let found = false;
        for(let pair of this._deck.list) {
            if(pair.abs_name == card.abs_name) {
                found = true;
                if(card.deck_count >= pair.count + 1) {
                    pair.count++;
                    break;
                }
            }
        }
        if(!found) {
            this._deck.list.push({ abs_name: card.abs_name, count: 1});
        }
        this.refreshUI();
    }
    sortList() {
        this._deck.list = this._deck.list.sort((a, b) => {
            return this.card_table[a.abs_name].basic_mana_cost
                - this.card_table[b.abs_name].basic_mana_cost;
        });
    }
    refreshUI() {
        if(this.width) {
            // 清掉舊圖
            for(let child of [...this.list_view.children]) {
                child.destroy();
            }
            // 畫卡牌列表
            let count = 0;
            this.sortList();
            for(let [i, pair] of this._deck.list.entries()) {
                this.drawPair(i, pair);
                count += pair.count;
            }
            // 更新卡牌張數
            this.count_txt.text = count.toString();
        }
        this.onChangeFunc();
    }
    drawPair(index: number, pair: { abs_name: string, count: number }) {
        const rec_h = 35;
        let rec = new PIXI.Graphics();
        rec.lineStyle(1, 0);
        rec.beginFill(0xffffff, 1);
        rec.drawRoundedRect(0, index * rec_h, this.width, rec_h, 5);
        rec.endFill();
        this.list_view.addChild(rec);
        let name = this.card_table[pair.abs_name].name;
        let txt = new PIXI.Text(`${name} x ${pair.count}`, new PIXI.TextStyle({
            fill: 0, fontSize: rec_h*0.5
        }));
        txt.position.set(0, index * rec_h);
        rec.addChild(txt);
        rec.filters = [new Filters.GlowFilter(20, 1, 2, 0x48e0cf, 0.5)];
        rec.filters[0].enabled = (this.cur_highlight == pair.abs_name);

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
        rec.on("mouseover", () => {
            this.onHover(this.card_table[pair.abs_name]);
        });
    }
}

function drawBtn(msg: string, color: number, width: number, height: number, onClick: () => void) {
    let btn = new PIXI.Graphics();
    btn.lineStyle(1, 0);
    btn.beginFill(color);
    btn.drawRoundedRect(0, 0, width, eh * 2, 5);
    btn.endFill();
    let txt = new PIXI.Text(msg, new PIXI.TextStyle({
        fontSize: height*0.8,
    }));
    txt.anchor.set(0.5, 0.5);
    txt.position.set(btn.width/2, btn.height/2);
    btn.addChild(txt);
    btn.interactive = true;
    btn.cursor = "pointer";
    btn.on("click", onClick);
    return btn;
}

function checkIfChanged(d1: Deck, d2: Deck) {
    if(d1.name != d2.name || d1.description != d2.description) {
        return true;
    } else if(d1.list.length != d2.list.length) {
        return true;
    } else {
        for(let [i, p] of d1.list.entries()) {
            if(p.abs_name != d2.list[i].abs_name || p.count != d2.list[i].count) {
                return true;
            }
        }
    }
    return false;
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
            console.log(e);
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
    let ratio = Math.max(width / bg.width, height / bg.height);
    bg.scale.set(ratio);
    app.stage.addChild(bg);

    let destroy_big = () => { };
    let cur_card: IKnownCard = null;
    let deck_ui = new DeckUI(deck, cards, card => {
        cur_card = card;
        if(card) {
            if(my_loader.resources[card.abs_name]) {
                destroy_big();
                destroy_big = show_big_card(deck_ui.view.x, 0, card);
            } else {
                my_loader.add(card).load(() => {
                    if(TypeGaurd.isSameCard(card, cur_card)) {
                        destroy_big();
                        destroy_big = show_big_card(deck_ui.view.x, 0, card);
                    }
                });
            }
        } else {
            destroy_big();
        }
    });
    let deck_backup = deck_ui.deck;
    app.stage.addChild(deck_ui.view);

    document.addEventListener("wheel", evt => { 
        if(deck_ui.hovering) {
            let delta = evt.wheelDelta ? evt.wheelDelta : -evt.deltaY;
            let sign: 1 | -1 = delta > 0 ? -1 : 1;
            deck_ui.scroll(sign);
        }
    });

    let search_viewer = new SearchViewer(gm, show_big_card, 35 * ew, 42 * eh);
    app.stage.addChild(search_viewer.view);
    await search_viewer.show(cards,
        c => deck_ui.addCard(c), (c, inside) => deck_ui.highlight(c, inside));

    let left_space = width - search_viewer.view.width;
    deck_ui.setWidth(left_space * 0.8);
    deck_ui.view.position.set(search_viewer.view.width + left_space * 0.1, 0);

    let save_btn = drawBtn("儲存", 0x15b1f4, left_space*0.8, eh*2, async () => {
        if(checkIfChanged(deck_backup, deck_ui.deck)) {
            let res = await fetch("/api/deck/edit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...deck_ui.deck, _id: DeckID }),
            });
            if(res.ok) {
                deck_backup = deck_ui.deck;
                save_btn.visible = false;
            }
        }
    });
    save_btn.visible = checkIfChanged(deck_ui.deck, deck_backup);
    save_btn.position.set(search_viewer.view.width + left_space * 0.1, eh * 36);
    deck_ui.setOnChange(() => {
        save_btn.visible = (checkIfChanged(deck_ui.deck, deck_backup));
    });

    let back_btn = drawBtn("返回", 0x15b1f4, left_space * 0.8, eh * 2, () => {
        let res = true;
        if(checkIfChanged(deck_backup, deck_ui.deck)) {
            res = confirm("是否要捨棄變更？");
        }
        if(res) {
            window.location.href = "/app";
        }
    });
    back_btn.position.set(search_viewer.view.width + left_space * 0.1, eh * 39);

    app.stage.addChild(save_btn);
    app.stage.addChild(back_btn);
}

document.body.appendChild(app.view);