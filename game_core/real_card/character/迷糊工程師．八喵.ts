import { Character, Upgrade } from "../../cards";
import { CardType, CardStat, BattleRole } from "../../enums";

import Flash from "./閃存少女";

let name = "迷糊工程師．八喵";
let description = "**記憶體洩露**：當本角色出場與每個世代開始時，召喚一名*閃存少女*至待命區。";

export default class C extends Character {
    name = name;
    description = description;
    basic_strength = 0;
    basic_mana_cost = 4;

    async onPlay() {
        let ch = await this.g_master.genCardToBoard(this.owner, () => {
            return new Flash(-1, this.owner, this.g_master, "閃存少女");
        });
        await this.my_master.changeCharTired(ch, false);
    }

    setupAliveEffect() {
        this.addActionWhileAlive(this.g_master.t_master.start_building_chain, async () => {
            let ch = await this.g_master.genCardToBoard(this.owner, () => {
                return new Flash(-1, this.owner, this.g_master, "閃存少女");
            });
            await this.my_master.changeCharTired(ch, false);
        });
    }
}