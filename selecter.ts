import { ICard, ICharacter, IUpgrade, ISpell, IEvent } from "./interface";
import { Player, CardType } from "./enums";
import { BadOperationError } from "./game_master";

class UISelecter {
}

class Selecter {
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

    public selectPosition(max=1, min=1): number {
        // TODO: 檢查這邊的位置合不合法，例如：超過4或小於0
        return this.selected_args[this.top++][0];
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
}

export default Selecter;