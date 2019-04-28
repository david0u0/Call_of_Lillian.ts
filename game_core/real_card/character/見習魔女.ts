import { Character } from "../../cards";
import { GamePhase, CharStat } from "../../enums";

let name = "見習魔女";
let description = "**啟程時刻**：（角色瞬間行動）承受1情緒，得到1魔力並抽一張牌。";

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 0;
    basic_strength = 0;
    basic_battle_role = { can_attack: true, can_block: true, is_melee: true };

    _abilities = [{
        description: "啟程時刻：承受1情緒，得到1魔力並抽一張牌",
        func: async () => {
            await this.my_master.addMana(1);
            await this.my_master.addEmo(1);
            await this.my_master.draw();
            await this.my_master.changeCharTired(this, true);
        },
        canTrigger: () => {
            return !this.is_tired && this.char_status == CharStat.StandBy;
        },
        can_play_phase: [GamePhase.InAction, GamePhase.Building, GamePhase.Exploit, GamePhase.InWar],
        instance: true
    }];
}