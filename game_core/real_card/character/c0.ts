import { Character } from "../../cards";
import { IEvent, TypeGaurd } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "魔法少女莉莉安";
let description = `做為額外的代價，你必需支付兩點以上分數。
**莉莉安的呼喚**：（角色瞬間行動）你可以推進的一個事件。若該事件因此完成，改為使之失敗，並令*魔法少女莉莉安*退場。`;

export default class C2 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 5;
    readonly basic_strength = 2;

    event_to_pay: IEvent|null = null;

    recoverFields() {
        this.event_to_pay = null;
    }

    async initialize(): Promise<boolean> {
        let evt = await this.g_master.selecter.selectSingleCard(this, TypeGaurd.isEvent, evt => {
            return evt.owner == this.owner;
        });
        this.event_to_pay = evt;
        return (evt == null);
    }

    onPlay() {
        if(this.event_to_pay) {
            // TODO: 放逐掉 event_to_pay
        } else {
            throw new BadOperationError("未指定欲放逐的事件卡", this);
        }
    }
}