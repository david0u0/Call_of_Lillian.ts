import { Character, Upgrade } from "../../cards";
import { CardType, CardStat, BattleRole } from "../../enums";

let name = "迷糊工程師．八喵";
let description = "**記憶體洩露**：當本角色出場與每個世代開始時，召喚一名*閃存少女*至待命區。";

export default class C extends Character {
    name = name;
    description = description;
    basic_strength = 0;
    basic_mana_cost = 4;

    onPlay() {
        this.g_master.genCharToBoard(this.owner, "閃存少女");
    }

    setupAliveeEffect() {
        this.addActionWhileAlive(true, this.g_master.t_master.start_building_chain, () => {
            this.g_master.genCharToBoard(this.owner, "閃存少女");
        });
    }
}