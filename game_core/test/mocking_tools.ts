import fs from "fs";
import path from "path";

import { IKnownCard, ICharacter, IUpgrade, ISpell, IEvent, IArena, TypeGaurd, ISelecter } from "../interface";
import { BadOperationError } from "../errors";
import { Player } from "../enums";
import { GameMaster } from "../game_master";
import { KnownCard } from "../cards";

export class TestSelecter implements ISelecter {
    private card_table: { [index: number]: IKnownCard } = {};
    public setCardTable(table: { [index: number]: IKnownCard }) {
        this.card_table = table;
    }

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
    public _selectCards<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
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
    public selectCardsInteractive<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        max=1, min=1, checkCanSelect=(card: T[]) => true
    ): T[] {
        return [];
    }

    /**
     * 此函式不（該）只是 selectCards 的閹割版。
     * 因為一次只選一張，程式可以非常清楚地指出哪些牌可以選。
     * 而一次選多張卡的函式則難以枚舉所有狀況，也難以用 UI 表示出來。
     */
    public selectSingleCard<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        checkCanSelect=(card: T) => true
    ): Promise<T|null> {
        let list = this._selectCards(guard, 1, 1, list => {
            return checkCanSelect(list[0]);
        });
        return new Promise<T|null>((resolve) => {
            if(list) {
                resolve(list[0]);
            } else {
                resolve(null);
            }
        });
    }
    public selectSingleCardInteractive<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        checkCanSelect = (card: T) => true
    ): Promise<T | null> {
        throw "Not yet implemented";
    }
}

const PREFIX = "./dist/game_core/real_card";
let card_class_table: { [index: string]: { new(seq: number, owner: Player, gm: GameMaster): KnownCard }} = {};

let card_type_dirs = fs.readdirSync(PREFIX);
for(let type_name of card_type_dirs) {
    let card_names = fs.readdirSync(`${PREFIX}/${type_name}`);
    for(let name of card_names) {
        try {
            let card_path = path.resolve(`${PREFIX}/${type_name}`, name);
            card_class_table[name] = require(card_path).default;
        } catch(err) { }
    }
}

export function genFunc(name: string, owner: Player, seq: number, gm: GameMaster): KnownCard {
    let C = card_class_table[`${name}.js`];
    return new C(seq, owner, gm);
}