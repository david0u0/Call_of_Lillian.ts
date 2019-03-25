import { ICard, ICharacter, IUpgrade, ISpell, IEvent, IArena, TypeGaurd } from "./interface";
import { Player } from "./enums";
import { BadOperationError } from "./game_master";

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

    public selectCard<T extends ICard>(guard: (c: ICard) => c is T,
        max=1 , min=1, checkCanSelect=(char: T) => true
    ): T[] {
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
                if(checkCanSelect(card)) {
                    return card;
                } else {
                    throw new BadOperationError("選到的卡片不符合要求！");
                }
            } else {
                throw new BadOperationError("選到的卡片沒通過型別檢查！");
            }
        });
        this.top += len;
        return cards;
    }

    /**
     * 後端會卡住，等待前端送訊息過來
     * 前端沒有「取消」的選項
     * 應用實例：某個事件已確定發生，你必需選一個目標來回應，如強迫棄牌、強迫擊退等。
     */
    public selectCardInteractive<T extends ICard>(guard: (c: ICard) => c is T,
        max=1, min=1, checkCanSelect=(char: ICard) => true
    ): T[] {
        return [];
    }
}

export default BackendSelecter;