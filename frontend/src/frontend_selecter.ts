import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter, ICard } from "../../game_core/interface";
import { getWinSize, getEltSize } from "./get_screen_size";
import { BadOperationError } from "../../game_core/errors";
import { Player } from "../../game_core/enums";

type CardLike = ICard|number|null;

export default class FrontendSelecter implements ISelecter {
    public view = new PIXI.Container();
    public cancel_view = new PIXI.Graphics();
    
    private resolve_card: (arg: CardLike|PromiseLike<CardLike>) => void = null;
    private card_table: { [index: number]: ICard } = {};
    private filter_func: (c: IKnownCard) => boolean;
    private lines: PIXI.Graphics[] = [];

    private _selecting = false;
    public get selecting() { return this._selecting; };

    constructor(private ticker: PIXI.ticker.Ticker) {
        let { width, height } = getWinSize();
        this.cancel_view.beginFill(0);
        this.cancel_view.drawRect(0, 0, width, height);
        this.cancel_view.endFill();
        this.cancel_view.alpha = 0;
        this.cancel_view.interactive = true;
        this.cancel_view.on("click", () => {
            if(this.resolve_card && this.selecting) {
                this.endSelect();
                this.resolve_card(null);
            }
        });
        this.view.interactive = true;
    }
    private endSelect() {
        this.view.removeAllListeners();
        this._selecting = false;
        for(let line of this.lines) {
            line.destroy();
        }
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
    selectSingleCard<T extends ICard>(caller: IKnownCard|IKnownCard[]|null, guard: (c: ICard) => c is T,
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
        let line_init_pos = [this.init_pos];
        if(caller) {
            line_init_pos = [];
            let _caller = (caller instanceof Array) ? caller : [caller];
            for(let card of _caller) {
                let caller_obj = this.card_obj_table[card.seq];
                if(caller_obj) {
                    line_init_pos.push({
                        x: caller_obj.worldTransform.tx,
                        y: caller_obj.worldTransform.ty
                    });
                }
            }
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
        return new Promise<T|null>(resolve => {
            this.resolve_card = resolve;
        });
    }

    selectSingleCardInteractive<T extends ICard>(player: Player,
        caller: IKnownCard|IKnownCard[], guard: (c: ICard) => c is T,
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
                this.endSelect();
                this.resolve_card(card);
                return true;
            } else {
                // this.resolve_card(null);
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