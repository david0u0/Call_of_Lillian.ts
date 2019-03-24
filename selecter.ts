import { ICard, ICharacter, IUpgrade, ISpell, IEvent } from "./interface";
import { Player, CardType } from "./enums";
import { BadOperationError } from "./game_master";

class UISelecter {
}

class Selecter {
    constructor(private card_table: { [index: number]: ICard }) { }
    private selected_seqs = new Array<number>();
    private top = 0;
    public setSelectedSeqs(seqs: Array<number> | number) {
        if(seqs instanceof Array) {
            this.selected_seqs = seqs;
        } else {
            this.selected_seqs = [seqs];
        }
        this.top = 0;
    }
    private select(card_type: CardType, max: number , min: number,
        checkCanSelect=(char: ICard) => true
    ): ICard[] {
        let seqs = this.selected_seqs.slice(this.top, this.top+max);
        let chars = seqs.map(seq => {
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
        let len = chars.length;
        if(len > max || len < min) {
            throw new BadOperationError(`選到的數量不在${min}~${max}的範圍`);
        }
        this.top += len;
        return chars;
    }
    public selectChars(max=1, min=1,
        checkCanSelect=(char: ICharacter) => true
    ): ICharacter[] {
        return this.select(CardType.Character, max, min, card => {
            return checkCanSelect(card as ICharacter);
        }) as ICharacter[];
    }
    public selectEvents(max=1, min=1,
        checkCanSelect=(event: IEvent) => true
    ): IEvent[] {
        return this.select(CardType.Event, max, min, card => {
            return checkCanSelect(card as IEvent);
        }) as IEvent[];
    }
}

export default Selecter;