import { Character } from "../../cards";
import { TypeGaurd } from "../../interface";
import { CharStat } from "../../enums";

let name = "遊擊隊長小芳";
let description = `突擊
英勇的遊擊隊員：*遊擊隊長小芳*參與的戰鬥中，所有*遊擊隊員*的戰力增加1。`;

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 6;
    basic_strength = 2;
    basic_battle_role = { can_attack: true, can_block: true };
    assault = true;
    
    setupAliveEffect() {
        this.my_master.get_strength_chain.append((str, { card }) => {
            if(TypeGaurd.isCharacter(card)) {
                if(this.char_status == CharStat.InWar
                    && card.char_status == CharStat.InWar
                    && card.name == "遊擊隊員"
                ) {
                    return { var_arg: str + 1 };
                }
            }
        });
    }
}