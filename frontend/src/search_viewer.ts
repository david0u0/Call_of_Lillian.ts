import * as Filters from "pixi-filters";
import { getEltSize, getWinSize } from "./get_constant";
import { GameMaster } from "../../game_core/master/game_master";
import { ShowBigCard } from "./show_big_card";
import { IKnownCard } from "../../game_core/interface";
import { getCardSize, drawCard } from "./draw_card";
import { my_loader } from "./card_loader";

const PAGE_LIMIT = 10;

export class SearchViewer {
    public readonly view = new PIXI.Container();
    private _hovering_page = false;
    public get hovering_page() { return this._hovering_page; }
    private page_view = new PIXI.Container();
    private index_txt: PIXI.Text;
    private cleanup_funcs = new Array<(() => void) | null>();
    private onClick: (card: IKnownCard) => void;
    private onHover: (card: IKnownCard, inside: boolean) => void;
    constructor(public readonly gm: GameMaster, private showBigCard: ShowBigCard,
        width: number, height: number
    ) {
        this.view.visible = false;
        this.index_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: 30, fill: 0
        }));
        this.index_txt.anchor.set(0, 1);
        this.view.addChild(this.index_txt);
        this.view.addChild(this.page_view);
        this.view.interactive = true;
        this.view.on("mouseover", () => this._hovering_page = true);
        this.view.on("mouseout", () => this._hovering_page = false);

        let dummy_rec = new PIXI.Graphics();
        dummy_rec.beginFill(0, 0);
        dummy_rec.drawRect(0, 0, width, height);
        dummy_rec.endFill();
        this.view.addChild(dummy_rec);
        this.index_txt.position.set(0, height);
    }

    private onWheel = (evt: WheelEvent) => { };

    public async show(card_list: IKnownCard[], onClick = (card: IKnownCard) => { }, 
        onHover = (card: IKnownCard, inside: boolean) => { }
    ) {
        this.onClick = onClick;
        this.onHover = onHover;
        this.destroyPage();
        this.view.visible = true;

        let len = card_list.length;
        let page_len = Math.floor(len / PAGE_LIMIT) + (len % PAGE_LIMIT == 0 ? 0 : 1);
        await this.showPage(card_list, 0, page_len);

        let index = 0;
        let loading = false;
        this.onWheel = async evt => {
            if(loading || !this._hovering_page) {
                return;
            }
            let delta = evt.wheelDelta ? evt.wheelDelta : -evt.deltaY;
            let sign: 1 | -1 = delta > 0 ? -1 : 1;
            index += sign;
            if(index < 0) {
                index = 0;
            } else if(index >= page_len) {
                index = page_len - 1;
            } else {
                loading = true;
                await this.showPage(card_list, index, page_len);
                loading = false;
            }
        };
        document.addEventListener("wheel", this.onWheel);
    }
    public hide() {
        this.view.visible = false;
        document.removeEventListener("wheel", this.onWheel);
        this.destroyPage();
    }
    private destroyPage() {
        for(let func of this.cleanup_funcs) {
            if(func) {
                func();
            }
        }
        this.cleanup_funcs = [];
        for(let child of [...this.page_view.children]) {
            child.destroy();
        }
    }
    private showPage(card_list: IKnownCard[], index: number, page_len: number) {
        this.destroyPage();
        this.index_txt.text = `${index + 1}/${page_len}`;

        card_list = card_list.slice(index * PAGE_LIMIT, index * PAGE_LIMIT + PAGE_LIMIT);
        let { width, height } = getCardSize(this.view.width / 5.2, this.view.height / 2.6);

        for(let c of card_list) {
            my_loader.add(c);
        }
        return new Promise<void>(resolve => {
            my_loader.load(() => {
                for(let i = 0; i < 2; i++) {
                    for(let j = 0; j < 5; j++) {
                        let n = i * 5 + j;
                        let card = card_list[n];
                        if(!card) {
                            break;
                        }
                        let card_ui = drawCard(this.gm, card, width, height, true);
                        card_ui.position.set(this.view.width / 5 * j, this.view.height / 2 * i);
                        card_ui.addChild(card_ui);
                        card_ui.interactive = true;
                        card_ui.cursor = "pointer";
                        this.cleanup_funcs.push(null);
                        card_ui.on("mouseover", () => {
                            this.onHover(card, true);
                            let destroy_big = this.showBigCard(card_ui.x + card_ui.width / 2,
                                card_ui.y + card_ui.height / 2, card);

                            this.cleanup_funcs[n] = () => {
                                this.onHover(card, false);
                                destroy_big();
                            };
                        });
                        card_ui.on("mouseout", () => {
                            this.onHover(card, false);
                            if(this.cleanup_funcs[n]) {
                                this.cleanup_funcs[n]();
                            }
                        });
                        card_ui.on("click", () => this.onClick(card));
                        this.page_view.addChild(card_ui);
                    }
                }
                resolve();
            });
        });
    }
}