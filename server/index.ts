import fs from "fs";
import path from "path";
import express from "express";

import { KnownCard } from "../game_core/cards";
import { Player } from "../game_core/enums";
import { GameMaster } from "../game_core/master/game_master";

let app = express();

const PREFIX = "./dist/game_core/real_card";
let card_class_table: { [index: string]: { new(seq: number, owner: Player, gm: GameMaster): KnownCard }} = {};

let card_type_dirs = fs.readdirSync(PREFIX);
for(let type_name of card_type_dirs) {
    let card_names = fs.readdirSync(`${PREFIX}/${type_name}`);
    for(let name of card_names) {
        try {
            let card_path = path.resolve(`${PREFIX}/${type_name}`, name);
            card_class_table[name] = require(card_path).default;
        } catch(err) { }
    }
}

function genCardFunc(name: string, owner: Player, seq: number, gm: GameMaster) {
    let C = card_class_table[name];
    return new C(seq, owner, gm);
}

app.use("/card_image", express.static("frontend/assets/card_image"));
app.use(express.static("frontend/dist"));

app.listen(8888);