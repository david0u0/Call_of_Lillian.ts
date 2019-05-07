import { Character } from "../../cards";
import { IEvent, TypeGaurd, ICharacter, IArena, buildConfig } from "../../interface";
import { BadOperationError } from "../../errors";
import { CardStat } from "../../enums";

let name = "魔法少女莉莉安";
let description = `做為額外的代價，你必須放逐一張兩分以上的事件卡。
**莉莉安的呼喚**：（角色瞬間行動）你可以放逐一張對手正在推進的事件，隨後令本角色退場。`;

export default class C2 extends Character implements ICharacter {
    name = name;
    description = description;
    basic_mana_cost = 5;
    readonly basic_strength = 2;

    readonly data: {
        arena_entered: IArena | null,
        str_counter: number,
        event_to_pay: IEvent | null
    } = {
        arena_entered: null,
        str_counter: 0,
        event_to_pay: null
    }

    async initialize(): Promise<boolean> {
        let evt = await this.g_master.selecter.selectCard(this.owner, this, buildConfig({
            guard: TypeGaurd.isEvent,
            owner: this.owner,
            is_finished: true,
            check: e => {
                return e.score >= 2;
            }
        }));

        if(evt == null) {
            return false;
        } else {
            this.data.event_to_pay = evt;
            return true;
        }
    }

    onPlay() {
        if(this.data.event_to_pay) {
            this.my_master.exileCard(this.data.event_to_pay);
        } else {
            throw new BadOperationError("未指定欲放逐的事件卡", this);
        }
    }
}