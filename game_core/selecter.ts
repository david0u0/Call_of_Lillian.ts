import { ICard, ICharacter, IUpgrade, ISpell, IEvent, IArena } from "./interface";
import { Player, CardType } from "./enums";
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

    private selectCard(card_type: CardType, max: number , min: number,
        checkCanSelect=(char: ICard) => true
    ): ICard[] {
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
            if(card.card_type == card_type) {
                if(checkCanSelect(card)) {
                    return card;
                } else {
                    throw new BadOperationError("選到的卡片不符合要求！");
                }
            } else {
                throw new BadOperationError(
                    `欲選擇${CardType[card_type]}，結果選到${CardType[card.card_type]}！`);
            }
        });
        this.top += len;
        return cards;
    }

    public selectChars(max=1, min=1,
        checkCanSelect=(char: ICharacter) => true
    ): ICharacter[] {
        return this.selectCard(CardType.Character, max, min, card => {
            return checkCanSelect(card as ICharacter);
        }) as ICharacter[];
    }
    public selectEvents(max=1, min=1,
        checkCanSelect=(event: IEvent) => true
    ): IEvent[] {
        return this.selectCard(CardType.Event, max, min, card => {
            return checkCanSelect(card as IEvent);
        }) as IEvent[];
    }
    public selectArena(max=1, min=1,
        checkCanSelect=(event: IArena) => true
    ): IArena[] {
        return this.selectCard(CardType.Arena, max, min, card => {
            return checkCanSelect(card as IArena);
        }) as IArena[];
    }

    /**
     * 後端會卡住，等待前端送訊息過來
     * 前端沒有「取消」的選項
     * 應用實例：某個事件已確定發生，你必需選一個目標來回應，如強迫棄牌、強迫擊退等。
     */
    private selectCardInteractive(card_type: CardType, max: number, min: number,
        checkCanSelect=(char: ICard) => true
    ): ICard[] {
        return [];
    }
    public selectCharsInteractive(max=1, min=1,
        checkCanSelect=(char: ICharacter) => true
    ): ICharacter[] {
        return this.selectCardInteractive(CardType.Character, max, min, card => {
            return checkCanSelect(card as ICharacter);
        }) as ICharacter[];
    }
}

export default BackendSelecter;