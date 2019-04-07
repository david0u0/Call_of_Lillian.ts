import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter, ICard } from "../../game_core/interface";
import { getWinSize, getEltSize } from "./get_screen_size";
import { BadOperationError } from "../../game_core/errors";

type CardLike = ICard|number|null;

export default class FrontendSelecter implements ISelecter {
    public view = new PIXI.Container();
    
    private resolve_card: (arg: CardLike|PromiseLike<CardLike>) => void = null;
    private card_table: { [index: number]: ICard } = {};
    private filter_func: (c: IKnownCard) => boolean;
    private line: PIXI.Graphics = null;

    private _selecting = false;
    public get selecting() { return this._selecting; };

    constructor(private ticker: PIXI.ticker.Ticker) {
        let dummy = new PIXI.Graphics();
        let { width, height } = getWinSize();
        dummy.drawRect(0, 0, width, height);
        dummy.alpha = 0;
        this.view.addChild(dummy);
        this.view.interactive = true;
    }

    setCardTable(table: { [index: number]: ICard }) {
        this.card_table = table;
    }

    selectText(caller: ICard, text: string[]): Promise<number|null> {
        let pos = { x: 0, y: 0 }; // TODO: 預設應該是頭像的位置
        let caller_obj = this.card_obj_table[caller.seq];
        if(caller_obj) {
            pos = { x: caller_obj.worldTransform.tx, y: caller_obj.worldTransform.ty };
        }
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
                    tmp_view.destroy();
                    resolve(i);
                });
                option_txt.position.set(pos.x, pos.y+i*eh*1.5);
                tmp_view.addChild(option_txt);
            }
        });
    }
    selectSingleCard<T extends ICard>(caller: ICard|null, guard: (c: ICard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        this._selecting = true;
        this.filter_func = card => {
            if(guard(card)) {
                return check(card);
            } else {
                return false;
            }
        };
        this.line = new PIXI.Graphics();
        this.view.addChild(this.line);
        let caller_obj: PIXI.DisplayObject = null;
        let line_init_pos = this.init_pos; // TODO: 預設應該是頭像的位置
        if(caller) {
            caller_obj = this.card_obj_table[caller.seq];
            if(caller_obj) {
                line_init_pos = { x: caller_obj.worldTransform.tx, y: caller_obj.worldTransform.ty };
            }
        }
        this.view.on("mousemove", evt => {
            this.line.clear();
            this.line.lineStyle(4, 0xffffff, 1);
            this.line.moveTo(line_init_pos.x, line_init_pos.y);
            this.line.lineTo(evt.data.global.x, evt.data.global.y);
        });
        this.view.on("click", evt => {
            // TODO: 想辦法做到點其它地方就取消
        });
        return new Promise<T|null>(resolve => {
            this.resolve_card = resolve;
        });
    }

    selectSingleCardInteractive<T extends ICard>(caller: ICard, guard: (c: ICard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        throw "not implemented!";
    }

    /**
     * @return 回傳值代表其是否符合選擇的要件
     */
    onCardClicked(card: IKnownCard): boolean {
        if(this.resolve_card && this.selecting) {
            this.view.removeAllListeners();
            this._selecting = false;
            this.line.destroy();
            if(this.filter_func(card)) {
                this.resolve_card(card);
                return true;
            } else {
                this.resolve_card(null);
                return false;
            }
        } else {
            throw new BadOperationError("沒有在選擇的時候不要打擾選擇器 =_=");
        }
    }

    private card_obj_table: { [index: number]: PIXI.DisplayObject } = {};
    registerCardObj(card: ICard, obj?: PIXI.DisplayObject) {
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
}