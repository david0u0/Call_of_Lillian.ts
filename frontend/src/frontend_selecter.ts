import * as Filters from "pixi-filters";
import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter, ICard, SelectConfig, TypeGaurd, UnknownCard } from "../../game_core/interface";
import { getWinSize, getEltSize, getPlayerColor } from "./get_constant";
import { BadOperationError } from "../../game_core/errors";
import { Player, CharStat, CardStat } from "../../game_core/enums";
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
    public prompt_txt: PIXI.Text;

    private _mem = new Array<number>();
    
    private resolve_card: (arg: CardLike|PromiseLike<CardLike>) => void = null;
    private card_table: { [index: number]: ICard } = {};
    private filter_func: (c: IKnownCard) => boolean;
    private lines: PIXI.Graphics[] = [];
    private cancel_btn = new StackableBtn();

    private _selecting = SelectState.None;
    public get selecting() { return this._selecting; };
    private _select_conf: SelectConfig<IKnownCard> = null;
    public get select_conf() { return this._select_conf; }

    constructor(private me: Player, private ticker: PIXI.ticker.Ticker) {
        let { width, height } = getWinSize();
        this.cancel_view.beginFill(0, 0);
        this.cancel_view.drawRect(0, 0, width, height);
        this.cancel_view.endFill();
        this.cancel_view.interactive = true;
        this.cancel_view.on("click", evt => {
            if(this.selecting != SelectState.None
                && this.selecting != SelectState.Btn && this.show_cancel_ui == null
            ) {
                evt.stopPropagation();
                this.endSelect(null);
            }
        });
        this.view.interactive = true;
        
        let { ew, eh } = getEltSize();
        this.view.addChild(this.cancel_btn.view);
        this.cancel_btn.view.position.set(ew, 39*eh);

        this.prompt_txt = new PIXI.Text("", new PIXI.TextStyle({
            fontSize: 3*ew,
            fontWeight: "bold",
            fontFamily: "微軟正黑體",
            fill: getPlayerColor(this.me, true),
            strokeThickness: 2
        }));
        this.prompt_txt.anchor.set(0.5, 0.5);
        this.prompt_txt.position.set(ew * 21, eh * 21);
        this.prompt_txt.visible = false;
        this.prompt_txt.alpha = 0.7;
    }
    public clearMem() {
        this._mem = [];
    }

    private endSelect(arg: CardLike) {
        if(arg == null && this.select_conf && this.select_conf.must_have_value) {
            return;
        }
        this._select_conf = null;
        this._selecting = SelectState.None;
        for(let line of this.lines) {
            line.destroy();
        }
        this.lines = [];
        this.view.removeAllListeners();

        this.show_cancel_ui = null;
        if(this.cancel_btn.selecting) {
            this.cancel_btn.stopBtn();
        }
        if(this.cancel_btn.popBtn()) {
            this._selecting = SelectState.Btn;
        }

        this.prompt_txt.visible = false;
        this.show_prompt_ui = null;

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
        if(this.selecting == SelectState.Btn) {
            this.cancel_btn.stackBtn();
        } else if(this.selecting != SelectState.None) {
            throw new BadOperationError("selectText: 正在選擇時呼叫選擇器", caller);
        }
        this._selecting = SelectState.Text;
        let { height, width } = getWinSize();
        let tmp_view = new PIXI.Container();
        let mask = new PIXI.Graphics();
        let { eh } = getEltSize();

        mask.beginFill(0, 0.5);
        mask.drawRect(0, 0, width, height);
        tmp_view.addChild(mask);
        this.view.addChildAt(tmp_view, 0);
        mask.interactive = true;
        mask.on("click", () => {
            if(this.show_cancel_ui == null) {
                this.endSelect(null);
            }
        });
        this.cleanup.push(() => tmp_view.destroy());
        return new Promise<number|null>(async resolve => {
            this.resolve_card = resolve;
            let pos = (await this.startSelect(caller))[0];
            for(let [i, s] of text.entries()) {
                let option_txt = new PIXI.Text(s, new PIXI.TextStyle({
                    fill: 0xffffff,
                    fontSize: eh
                }));
                option_txt.interactive = true;
                option_txt.cursor = "pointer";
                option_txt.on("click", () => {
                    this.endSelect(i);
                });
                option_txt.position.set(pos.x, pos.y+i*eh*1.5);
                tmp_view.addChild(option_txt);
            }
        });
    }
    selectCard<T extends IKnownCard>(player: Player, caller: IKnownCard|IKnownCard[]|null,
        conf: SelectConfig<T>
    ): Promise<T | UnknownCard | null> {
        if(this.selecting == SelectState.Btn) {
            this.cancel_btn.stackBtn();
        } else if(this.selecting != SelectState.None) {
            throw new BadOperationError("selectCard: 正在選擇時呼叫選擇器", caller);
        }

        let filter = new Filters.GlowFilter(20, 2, 0, getPlayerColor(player, true), 0.5);

        player = this.me; // FIXME: 這行要拿掉
        if(player != this.me) {
            // TODO: 從佇列中拉出資料來回傳
        } else {
            if(!conf.stat) {
                conf = { ...conf, stat: CardStat.Onboard };
            }
            this._selecting = SelectState.Card;
            this._select_conf = { ...conf };
            this.filter_func = card => {
                if(conf.guard(card)
                    && (typeof(conf.owner) == "undefined" || card.owner == conf.owner)
                    && card.card_status == conf.stat
                ) {
                    if(TypeGaurd.isCharacter(card)) {
                        if(typeof conf.is_tired != "undefined" && card.is_tired != conf.is_tired) {
                            return false;
                        } else if(typeof conf.char_stat!= "undefined" && card.char_status != conf.char_stat) {
                            return false;
                        }
                    } else if(TypeGaurd.isEvent(card)) {
                        if(typeof conf.is_finished != "undefined" && card.is_finished != conf.is_finished) {
                            return false;
                        }
                    }
                    if(conf.check) {
                        return conf.check(card);
                    } else {
                        return true;
                    }
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
                    line.filters = [filter];
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

    selectCardInteractive<T extends IKnownCard>(player: Player,
        caller: IKnownCard | IKnownCard[], conf: SelectConfig<T>,
    ) {
        // FIXME: 
        return this.selectCard(player, caller, conf);
    }

    /**
     * @return 回傳值代表其是否符合選擇的要件
     */
    onCardClicked(card: IKnownCard): boolean {
        if(this.selecting == SelectState.Card) {
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
            this.showCancelUI();
            this.showPromptUI();
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
    private async showCancelUI() {
        if(this.show_cancel_ui) {
            let res = await this.cancel_btn.startBtn(this.show_cancel_ui);
            if(res) {
                this.endSelect(null);
            }
        }
    }

    private show_prompt_ui: string | null = null;
    public promptUI(prompt_ui: string) {
        this.show_prompt_ui = prompt_ui;
        return this;
    }
    private async showPromptUI() {
        if(typeof this.show_prompt_ui == "string") {
            this.prompt_txt.text = this.show_prompt_ui;
            this.prompt_txt.visible = true;
        }
    }

    public async selectConfirm(
        player: Player, caller: IKnownCard|null, msg: string
    ): Promise<boolean> {
        if(this.selecting == SelectState.Btn) {
            this.cancel_btn.stackBtn();
        } else if(this.selecting != SelectState.None) {
            throw new BadOperationError(`selectConfirm: 正在選擇時呼叫選擇器：${msg}`);
        }

        player = this.me; // FIXME:
        if(player != this.me) {

        } else {
            this._selecting = SelectState.Btn;
            return await this.cancel_btn.startBtn(msg);
        }
    }
    public stopConfirm() {
        if(this.selecting == SelectState.Btn) {
            this._selecting = SelectState.None;
            this.cancel_btn.stopBtn();
        }
    }
}

class StackableBtn {
    public view = new PIXI.Container();

    private stack = new Array<{ resolve_func: (arg: boolean) => void, txt: string }>();
    private txt_view: PIXI.Text;

    private cur_msg: string;
    private cur_resolve: (arg: boolean) => void;

    public selecting = false;

    constructor() {
        let { ew, eh } = getEltSize();
        this.view.interactive = true;
        this.view.cursor = "pointer";
        this.view.visible = false;

        let btn_bg = new PIXI.Graphics();
        btn_bg.beginFill(0x6298f3);
        btn_bg.drawRect(0, 0, ew * 4, eh * 2);
        btn_bg.endFill();
        this.view.addChild(btn_bg);

        this.txt_view = new PIXI.Text("", new PIXI.TextStyle({
            fill: 0,
            fontSize: eh * 1.5
        }));
        this.txt_view.anchor.set(0.5, 0.5);
        this.view.addChild(this.txt_view);
        this.txt_view.position.set(ew * 2, eh);

        this.view.on("click", () => {
            this.cur_resolve(true);
            this.view.visible = false;
            this.selecting = false;
        });
    }
    public async startBtn(msg: string): Promise<boolean> {
        if(this.selecting) {
            throw new BadOperationError("StackableBtn: 正在選擇中還想啟動選擇");
        }
        this.cur_msg = msg;
        this.txt_view.text = msg;
        this.view.visible = true;
        this.selecting = true;
        return new Promise<boolean>(resolve => {
            this.cur_resolve = resolve;
        });
    }
    public stackBtn() {
        if(this.selecting) {
            this.stack.push({ txt: this.cur_msg, resolve_func: this.cur_resolve });
            this.view.visible = false;
            this.selecting = false;
        }
    }
    public popBtn(): boolean {
        if(!this.selecting) {
            let obj = this.stack.pop();
            if(obj) {
                this.cur_msg = obj.txt;
                this.txt_view.text = this.cur_msg;
                this.cur_resolve = obj.resolve_func;
                this.view.visible = true;
                this.selecting = true;
                return true;
            }
        }
        return false;
    }

    public stopBtn() {
        if(this.selecting) {
            this.cur_resolve(false);
            this.view.visible = false;
            this.selecting = false;
        } else {
            // throw new BadOperationError("StackableBtn: 不在選擇中卻想停止選擇");
        }
    }
}