import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter, ICard, SelectConfig } from "../../game_core/interface";
import { getWinSize, getEltSize } from "./get_constant";
import { BadOperationError } from "../../game_core/errors";
import { Player, CharStat } from "../../game_core/enums";
import { ShowBigCard } from "./show_big_card";
import { getCardSize } from "./draw_card";

export enum SelectState { Text, OnBoard, None, Btn, Card };

type CardLike = ICard|number|boolean|null;
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

    private _selecting = SelectState.None;
    public get selecting() { return this._selecting; };
    private _selecting_conf: SelectConfig<ICard> = null;
    public get select_conf() { return this._selecting_conf; }

    constructor(private me: Player, private ticker: PIXI.ticker.Ticker) {
        let { width, height } = getWinSize();
        this.cancel_view.beginFill(0);
        this.cancel_view.drawRect(0, 0, width, height);
        this.cancel_view.endFill();
        this.cancel_view.alpha = 0;
        this.cancel_view.interactive = true;
        this.cancel_view.on("click", evt => {
            if(this.resolve_card && this.selecting && this.show_cancel_ui == null) {
                evt.stopPropagation();
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

    private endSelect(arg: CardLike) {
        this._selecting = SelectState.None;
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

        if(arg == null) {
            this._mem.push(-1);
        } else if(typeof(arg) == "number") {
            this._mem.push(arg);
        } else if(typeof(arg) == "boolean") {
            this._mem.push(arg ? 1 : 0);
        } else {
            this._mem.push(arg.seq);
        }
    }

    setCardTable(table: { [index: number]: ICard }) {
        this.card_table = table;
    }

    selectText(player: Player, caller: IKnownCard, text: string[]): Promise<number|null> {
        this._selecting = SelectState.Card;
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
        conf: SelectConfig<T>,
        check=(card: T) => true
    ): Promise<T | null> {
        player = this.me; // FIXME: 這行要拿掉
        if(player != this.me) {
            // TODO: 從佇列中拉出資料來回傳
        } else {
            this._selecting = SelectState.Card;
            this._selecting_conf = { ...conf };
            this.showCancelUI();
            this.filter_func = card => {
                if(conf.guard(card)
                    && (typeof(conf.owner) == "undefined" || card.owner == conf.owner)
                    && card.card_status == conf.stat
                ) {
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
        caller: IKnownCard | IKnownCard[], conf: SelectConfig<T>,
        check=(card: T) => true
    ): Promise<T | null> {
        // FIXME: 
        return this.selectCard(player, caller, conf, check);
    }

    /**
     * @return 回傳值代表其是否符合選擇的要件
     */
    onCardClicked(card: IKnownCard): boolean {
        if(this.resolve_card && this.selecting == SelectState.Card) {
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

    private show_prompt_ui: string | null = null;
    public promptUI(prompt_ui) {
        this.show_prompt_ui = prompt_ui;
        return this;
    }

    public async selectCancelBtn(
        player: Player, caller: IKnownCard|null, msg?: string
    ): Promise<true|null> {
        player = this.me; // FIXME:
        if(player != this.me) {

        } else {
            this._selecting = SelectState.Btn;
            this.cancelUI(msg);
            this.showCancelUI();
            return new Promise<true|null>(resolve => {
                this.resolve_card = resolve;
            });
        }
    }
    public stopCancelBtn() {
        if(this._selecting == SelectState.None) {
            // 啥都不做
        } else if(this._selecting != SelectState.Btn) {
            throw new BadOperationError("不是按鈕狀態卻想停止按鈕");
        } else {
            this.endSelect(true);
        }
    }
}