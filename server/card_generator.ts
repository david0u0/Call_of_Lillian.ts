import fs from "fs";
import path from "path";
import { Player } from "../game_core/enums";
import { GameMaster } from "../game_core/master/game_master";
import { TestSelecter } from "../game_core/test/mocking_tools";
import { IKnownCard } from "../game_core/interface";
import * as config from "./config";

const PREFIX = "./dist/game_core/real_card";
let card_class_table: {
    [index: string]: { new(seq: number, owner: Player, gm: GameMaster): IKnownCard }
} = {};

let card_type_dirs = fs.readdirSync(PREFIX);
for(let type_name of card_type_dirs) {
    let card_names = fs.readdirSync(`${PREFIX}/${type_name}`);
    for(let name of card_names) {
        try {
            let card_path = path.resolve(`${PREFIX}/${type_name}`, name);
            name = name.replace(/\.[^.]+$/, "");
            card_class_table[name] = require(card_path).default;
        } catch(err) {
            console.log(`無法讀取卡牌：${name}`);
        }
    }
}

function generateCard(abs_name: string, owner: Player, seq: number, gm: GameMaster) {
    let C = card_class_table[abs_name];
    return new C(seq, owner, gm);
}

const global_dummy_gm = new GameMaster(new TestSelecter(), generateCard);

let card_obj_table: { [abs_name: string]: IKnownCard } = {};
for(let abs_name of Object.keys(card_class_table)) {
    try {
        let card = generateCard(abs_name, Player.Player1, -1, global_dummy_gm);
        // 若是發佈配置，就不允許使用未經測試的卡牌
        if(card.tested || config.MODE != "RELEASE") {
            card_obj_table[abs_name] = card;
        }
    } catch(err) {
        console.log(`無法建構卡牌：${abs_name}`);
        if(err instanceof Error) {
            console.log(err.message);
        }
    }
}

let card_list = Object.keys(card_obj_table);

export {
    card_list,
    card_obj_table,
    generateCard
};