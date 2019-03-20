import { Character } from "../../../cards";

let name = "見習魔女";
let description = `
**啟程時刻**：（角色行動）你可以從牌庫抽一張牌。`;

export class C1 extends Character {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_strength = 0;

    // TODO: 塞入角色行動
}