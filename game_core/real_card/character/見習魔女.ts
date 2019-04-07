import { Character } from "../../cards";

let name = "見習魔女";
let description = `
**啟程時刻**：（角色行動）你可以從牌庫抽一張牌。`;

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_strength = 0;
    basic_battle_role = { can_attack: true, can_block: true, is_melee: true };

    abilities = [{
        description: "啟程時刻：從牌庫抽一張牌",
        func: () => {
            this.my_master.draw();
            this.my_master.changeCharTired(this, true);
        },
        canTrigger: () => {
            return !this.is_tired;
        }
    }];
    // TODO: 塞入角色行動
}