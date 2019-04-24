import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter, ICard } from "../../game_core/interface";
import { getWinSize, getEltSize } from "./get_constant";
import { BadOperationError } from "../../game_core/errors";
import { Player } from "../../game_core/enums";
import { ShowBigCard } from "./show_big_card";
import { getCardSize } from "./draw_card";

type CardLike = ICard|number|null;
type StartSelectFunc = () => Promise<{
    view: PIXI.Container,
    cleanup: () => void
}> | { view: PIXI.Container, cleanup: () => void };

export default class FrontendSelecter implements ISelecter {
    public view = new PIXI.Container();
    public cancel_view = new PIXI.Graphics();
    private _mem = new Array<number>();
    
    private resolve_card: (arg: CardLike|PromiseLike<CardLike>) => void = null;
    private card_table: { [index: number]: ICard } = {};
    private filter_func: (c: IKnownCard) => boolean;
    private lines: PIXI.Graphics[] = [];
    private cancel_btn = new PIXI.Container();
    private cancel_txt: PIXI.Text;

    private _selecting = false;
    public get selecting() { return this._selecting; };

    constructor(private me: Player, private showBigCard: ShowBigCard, private ticker: PIXI.ticker.Ticker) {
        let { width, height } = getWinSize();
        this.cancel_view.beginFill(0);
        this.cancel_view.drawRect(0, 0, width, height);
        this.cancel_view.endFill();
        this.cancel_view.alpha = 0;
        this.cancel_view.interactive = true;
        this.cancel_view.on("click", () => {
            if(this.resolve_card && this.selecting && this.show_cancel_ui == null) {
                this.endSelect(null);
            }
        });
        this.view.interactive = true;

        let { ew, eh } = getEltSize();
        this.cancel_btn.interactive = true;
        this.cancel_btn.cursor = "pointer";
        this.view.addChild(this.cancel_btn);
        this.cancel_btn.position.set(ew, 39*eh);
        this.cancel_btn.visible = false;

        let cancel_btn_bg = new PIXI.Graphics();
        cancel_btn_bg.beginFill(0x6298f3);
        cancel_btn_bg.drawRect(0, 0, ew * 4, eh * 2);
        cancel_btn_bg.endFill();
        this.cancel_btn.addChild(cancel_btn_bg);

        this.cancel_txt = new PIXI.Text("", new PIXI.TextStyle({
            fill: 0,
            fontSize: eh * 1.5
        }));
        this.cancel_txt.anchor.set(0.5, 0.5);
        this.cancel_btn.addChild(this.cancel_txt);
        this.cancel_txt.position.set(ew * 2, eh);

        this.cancel_btn.on("click", () => {
            this.endSelect(null);
        });
    }
    public clearMem() {
        this._mem = [];
    }

    private endSelect(arg?: CardLike) {
        this._selecting = false;
        for(let line of this.lines) {
            line.destroy();
        }
        this.view.removeAllListeners();
        this.lines = [];
        this.cancel_btn.visible = false;
        this.show_cancel_ui = null;
        for(let func of this.cleanup) {
            func();
        }
        this.cleanup = [];
        if(this.resolve_card) {
            this.resolve_card(arg);
        }
        this.resolve_card = null;
        if(typeof(arg) == "undefined") {
            // 啥都不做
        } else if(arg == null) {
            this._mem.push(-1);
        } else if(typeof(arg) == "number") {
            this._mem.push(arg);
        } else {
            this._mem.push(arg.seq);
        }
    }

    setCardTable(table: { [index: number]: ICard }) {
        this.card_table = table;
    }

    selectText(player: Player, caller: IKnownCard, text: string[]): Promise<number|null> {
        let { height, width } = getWinSize();
        let tmp_view = new PIXI.Container();
        let mask = new PIXI.Graphics();
        let { eh } = getEltSize();

        mask.beginFill(0, 0.5);
        mask.drawRect(0, 0, width, height);
        tmp_view.addChild(mask);
        this.view.addChild(tmp_view);
        return new Promise<number|null>(async resolve => {
            let pos = (await this.startSelect(caller))[0];
            for(let [i, s] of text.entries()) {
                let option_txt = new PIXI.Text(s, new PIXI.TextStyle({
                    fill: 0xffffff,
                    fontSize: eh
                }));
                option_txt.interactive = true;
                option_txt.cursor = "pointer";
                option_txt.on("click", () => {
                    tmp_view.destroy();
                    this.endSelect(i);
                    resolve(i);
                });
                option_txt.position.set(pos.x, pos.y+i*eh*1.5);
                tmp_view.addChild(option_txt);
            }
        });
    }
    selectCard<T extends ICard>(player: Player, caller: IKnownCard|IKnownCard[]|null,
        guard: (c: ICard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        player = this.me; // FIXME: 這行要拿掉
        if(player != this.me) {
            // TODO: 從佇列中拉出資料來回傳
        } else {
            this.showCancelUI();
            this._selecting = true;
            this.filter_func = card => {
                if(guard(card)) {
                    return check(card);
                } else {
                    return false;
                }
            };
            return new Promise<T | null>(async resolve => {
                let line_init_pos: { x: number, y: number }[];
                if(caller) {
                    line_init_pos = await this.startSelect(caller);
                } else {
                    line_init_pos = [this.init_pos];
                }
                this.lines = [];
                for(let pos of line_init_pos) {
                    let line = new PIXI.Graphics();
                    this.view.addChild(line);
                    this.lines.push(line);
                }
                this.view.on("mousemove", evt => {
                    for(let [i, line] of this.lines.entries()) {
                        line.clear();
                        line.lineStyle(4, 0xffffff, 1);
                        line.moveTo(line_init_pos[i].x, line_init_pos[i].y);
                        line.lineTo(evt.data.global.x, evt.data.global.y);
                    }
                });

                this.resolve_card = resolve;
            });
        }
    }

    selectCardInteractive<T extends ICard>(player: Player,
        caller: IKnownCard | IKnownCard[], guard: (c: ICard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        // FIXME: 
        return this.selectCard(player, caller, guard, check);
    }

    /**
     * @return 回傳值代表其是否符合選擇的要件
     */
    onCardClicked(card: IKnownCard): boolean {
        if(this.resolve_card && this.selecting) {
            if(this.filter_func(card)) {
                this.endSelect(card);
                return true;
            } else {
                // this.resolve_card(null);
                return false;
            }
        } else {
            throw new BadOperationError("沒有在選擇的時候不要打擾選擇器 =_=");
        }
    }

    private cleanup = new Array<() => void>();
    private start_select_talbe: { [seq: number]: StartSelectFunc } = {};
    registerCardStartSelect(card: ICard, func?: StartSelectFunc) {
        if(func) {
            this.start_select_talbe[card.seq] = func;
        } else if(card.seq in this.start_select_talbe) {
            delete this.start_select_talbe[card.seq];
        }
    }

    private init_pos = { x: 0, y: 0 };
    setInitPos(x, y) {
        this.init_pos = { x, y };
    }

    private async startSelect(cards: IKnownCard[] | IKnownCard): Promise<{ x: number, y: number }[]> {
        if(cards instanceof Array) {
            let pos = new Array<{ x: number, y: number }>();
            for(let c of cards) {
                let func = this.start_select_talbe[c.seq];
                if(func) {
                    let { view, cleanup } = await Promise.resolve(func());
                    if(view && view.transform) { // 確保 view 還沒被銷毀
                        this.cleanup.push(cleanup);
                        pos.push({
                            x: view.worldTransform.tx + (view.width) / 2,
                            y: view.worldTransform.ty,
                        });
                    }
                }
            }
            return pos;
        } else {
            return await this.startSelect([cards]);
        }
    }

    private show_cancel_ui: string | null = null;
    public cancelUI(cancel_msg="略過") {
        this.show_cancel_ui = cancel_msg;
        return this;
    }
    private showCancelUI() {
        if(this.show_cancel_ui) {
            this.cancel_txt.text = this.show_cancel_ui;
            this.cancel_btn.visible = true;
        }
    }
}