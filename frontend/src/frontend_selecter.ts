import * as PIXI from "pixi.js";
import { IKnownCard, ISelecter } from "../../game_core/interface";
import { getWinSize } from "./get_screen_size";
import { BadOperationError } from "../../game_core/errors";

type CardLike = IKnownCard|null;

export default class FrontendSelecter implements ISelecter {
    public view = new PIXI.Container();
    
    private resolve_card: (arg: CardLike|PromiseLike<CardLike>) => void = null;
    private mouse_init_pos = { x: 0, y: 0 };
    private card_table: { [index: number]: IKnownCard } = {};
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

    setCardTable(table: { [index: number]: IKnownCard }) {
        this.card_table = table;
    }

    selectSingleCard<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
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
        this.view.on("mousemove", evt => {
            this.line.clear();
            this.line.lineStyle(4, 0xffffff, 1);
            this.line.moveTo(this.mouse_init_pos.x, this.mouse_init_pos.y);
            this.line.lineTo(evt.data.global.x, evt.data.global.y);
        });
        return new Promise<T|null>(resolve => {
            this.resolve_card = resolve;
        });
    }

    selectSingleCardInteractive<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
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
                this.view.removeAllListeners();
                this._selecting = false;
                this.line.destroy();
                this.resolve_card(card);
                return true;
            } else {
                return false;
            }
        } else {
            throw new BadOperationError("沒有在選擇的時候不要打擾選擇器 =_=");
        }
    }
    setMousePosition(x: number, y: number) {
        this.mouse_init_pos = { x, y };
    }
}