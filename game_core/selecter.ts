import { ICard, ICharacter, IUpgrade, ISpell, IEvent, IArena, TypeGaurd } from "./interface";
import { Player } from "./enums";
import { BadOperationError } from "./errors";

class UISelecter {
}

class BackendSelecter {
    constructor(private card_table: { [index: number]: ICard }) { }
    private selected_args = new Array<Array<number>>();
    private top = 0;
    public setSelectedSeqs(seqs: Array<number> | number) {
        this.top = 0;
        this.selected_args = [];
        this.appendSelectedSeqs(seqs);
    }
    public appendSelectedSeqs(seqs: Array<number> | number) {
        if(seqs instanceof Array) {
            this.selected_args.push(seqs);
        } else {
            this.selected_args.push([seqs]);
        }
    }

    /**
     * @param guard 一個 type guard 用來決定要選哪種卡片
     * @param max 最多可以選 max 張卡
     * @param min 最少必需選 min 張卡
     * @param checkCanSelect 一個篩選器，決定哪些卡可以選（回傳的都是符合此條件者）
     * @returns 理論上應該是一個符合條件的卡牌陣列，如果是 null，代表被取消。（應該只有在前端會發生）
     */
    public selectCards<T extends ICard>(guard: (c: ICard) => c is T,
        max=1 , min=1, checkCanSelect=(card: T[]) => true
    ): T[]|null {
        if(this.selected_args.length <= this.top) {
            throw new BadOperationError(`選到的數量不在${min}~${max}的範圍`);
        }
        let seqs = this.selected_args[this.top++];
        let len = seqs.length;
        if(len > max || len < min) {
            throw new BadOperationError(`選到的數量不在${min}~${max}的範圍`);
        }
        let cards = seqs.map(seq => {
            let card = this.card_table[seq];
            if(guard(card)) {
                return card;
            } else {
                throw new BadOperationError("選到的卡片沒通過型別檢查！");
            }
        });
        if(!checkCanSelect(cards)) {
            throw new BadOperationError("選到的卡片不符合要求！");
        } else {
            return cards;
        }
    }

    /**
     * 後端會卡住，等待前端送訊息過來
     * 前端沒有「取消」的選項
     * 應用實例：某個事件已確定發生，你必需選一個目標來回應，如強迫棄牌、強迫擊退等。
     */
    public selectCardsInteractive<T extends ICard>(guard: (c: ICard) => c is T,
        max=1, min=1, checkCanSelect=(card: T[]) => true
    ): T[] {
        return [];
    }

    /**
     * 此函式不（該）只是 selectCards 的閹割版。
     * 因為一次只選一張，程式可以非常清楚地指出哪些牌可以選。
     * 而一次選多張卡的函式則難以枚舉所有狀況，也難以用 UI 表示出來。
     */
    public selectSingleCard<T extends ICard>(guard: (c: ICard) => c is T,
        checkCanSelect=(card: T) => true
    ): T|null {
        let list = this.selectCards(guard, 1, 1, list => {
            return checkCanSelect(list[0]);
        });
        if(list) {
            return list[0];
        } else {
            return null;
        }
    }
    public selectSingleCardInteractive<T extends ICard>(guard: (c: ICard) => c is T,
        checkCanSelect=(card: T) => true
    ): T {
        throw "Not yet implemented";
    }
}

export default BackendSelecter;