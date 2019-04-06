import { Upgrade, Character } from "../../cards";

let name = "大衛化";
let description = "每當裝備者承受情緒傷害時，";

export default class U extends Upgrade {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_strength = 0;

    onPlay() {
    }
}