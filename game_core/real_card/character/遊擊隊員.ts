import { Character } from "../../cards";

let name = "遊擊隊員";
let description = "突擊";

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 1;
    basic_strength = 1;
    basic_battle_role = { can_attack: true, can_block: true, is_melee: true };
    assault = true;
}