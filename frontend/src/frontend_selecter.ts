import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter, ICard } from "../../game_core/interface";
import { getWinSize, getEltSize } from "./get_screen_size";
import { BadOperationError } from "../../game_core/errors";
import { Player } from "../../game_core/enums";

type CardLike = ICard|number|null;

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

    constructor(private me: Player, private ticker: PIXI.ticker.Ticker) {
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
            fontSize: eh*1.5
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
        this.view.removeAllListeners();
        this._selecting = false;
        for(let line of this.lines) {
            line.destroy();
        }
        this.cancel_btn.visible = false;
        this.show_cancel_ui = null;

        this.resolve_card(arg);
        if(arg == null) {
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
        let pos = this.getPos(caller)[0]; 
        let { height, width } = getWinSize();
        let tmp_view = new PIXI.Container();
        let mask = new PIXI.Graphics();
        mask.beginFill(0, 0.5);
        mask.drawRect(0, 0, width, height);
        tmp_view.addChild(mask);
        this.view.addChild(tmp_view);
        let { ew, eh } = getEltSize();

        return new Promise<number|null>(resolve => {
            for(let [i, s] of text.entries()) {
                let option_txt = new PIXI.Text(s, new PIXI.TextStyle({
                    fill: 0xffffff,
                    fontSize: eh
                }));
                option_txt.interactive = true;
                option_txt.cursor = "pointer";
                option_txt.on("click", () => {
                    // TODO: 應該使用 this.endSelect
                    tmp_view.destroy();
                    resolve(i);
                    this._mem.push(i);
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
            let line_init_pos: { x: number, y: number }[];
            if(caller) {
                line_init_pos = this.getPos(caller);
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
            return new Promise<T | null>(resolve => {
                this.resolve_card = resolve;
            });
        }
    }

    selectCardInteractive<T extends ICard>(player: Player,
        caller: IKnownCard | IKnownCard[], guard: (c: ICard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        throw "not implemented!";
    }

    /**
     * @return 回傳值代表其是否符合選擇的要件
     */
    onCardClicked(card: IKnownCard): boolean {
        if(this.resolve_card && this.selecting) {
            if(this.filter_func(card)) {
                this.endSelect(card);
                this.resolve_card(card);
                this._mem.push(card.seq);
                return true;
            } else {
                // this.resolve_card(null);
                return false;
            }
        } else {
            throw new BadOperationError("沒有在選擇的時候不要打擾選擇器 =_=");
        }
    }

    private card_obj_table: { [index: number]: PIXI.Container } = {};
    registerCardObj(card: ICard, obj?: PIXI.Container) {
        if(obj) {
            this.card_obj_table[card.seq] = obj;
        } else if(card.seq in this.card_obj_table) {
            delete this.card_obj_table[card.seq];
        }
    }

    private init_pos = { x: 0, y: 0 };
    setInitPos(x, y) {
        this.init_pos = { x, y };
    }

    getPos(cards: IKnownCard[] | IKnownCard): { x: number, y: number }[] {
        if(cards instanceof Array) {
            let pos = new Array<{ x: number, y: number }>();
            for(let c of cards) {
                let obj = this.card_obj_table[c.seq];
                if(obj) {
                    let p = {
                        x: obj.worldTransform.tx + (obj.width)/2,
                        y: obj.worldTransform.ty,
                    };
                    pos.push(p);
                } else {
                    // TODO: 秀大圖出來讓人知道是被誰選中？
                }
            }
            return pos;
        } else {
            return this.getPos([cards]);
        }
    }

    private show_cancel_ui: string|null = null;
    public cancelUI(cancel_msg: string) {
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