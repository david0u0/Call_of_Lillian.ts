import { ICard, ICharacter, IUpgrade, ISpell } from "./interface";
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
    public selectChars(max=1, min=1,
        checkCanSelect=(char: ICharacter) => true
    ): ICharacter[] {
        let seqs = this.selected_seqs.slice(this.top, this.top+max);
        let chars = seqs.map(seq => {
            let card = this.card_table[seq];
            if(card.card_type == CardType.Character) {
                let char = card as ICharacter;
                if(checkCanSelect(char)) {
                    return char;
                } else {
                    throw new BadOperationError("欲從待命區選角，結果選到的角色不符合要求！");
                }
            } else {
                throw new BadOperationError("欲從待命區選角，結果選到不是角色的卡片！");
            }
        });
        let len = chars.length;
        if(len > max || len < min) {
            throw new BadOperationError(`欲從待命區選角，結果選到的數量不在${min}~${max}的範圍`);
        }
        this.top += len;
        return chars;
    }
}

export default Selecter;