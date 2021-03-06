#!node

let fs = require("fs");
let path = require("path");

let txt = 
`import { BadOperationError } from "../../game_core/errors";
import { GameMaster } from "../../game_core/master/game_master";
import { IKnownCard } from "../../game_core/interface";
import { Player } from "../../game_core/enums";
let card_class_table: {
    [abs_name: string]: { new(seq: number, owner: Player, gm: GameMaster, abs_name: string): IKnownCard }
} = {};
`;

const PREFIX = "../game_core/real_card";
let card_type_dirs = fs.readdirSync(PREFIX);
for(let type_name of card_type_dirs) {
    let card_names = fs.readdirSync(`${PREFIX}/${type_name}`);
    for(let name of card_names) {
        try {
            let card_path = `../${PREFIX}/${type_name}/${name}`;
            //path.resolve(`${PREFIX}/${type_name}`, name);
            // card_path = card_path.replace(/\\/g, "/");
            name = name.replace(/\.[^.]+$/, "");
            txt += `card_class_table["${name}"] = require("${card_path}").default;\n`;
        } catch(err) {
            console.log(err);
        }
    }
}

txt +=
`export default function generateCard(abs_name: string, owner: Player, seq: number, gm: GameMaster) {
    let C = card_class_table[abs_name];
    if(C) {
        return new C(seq, owner, gm, abs_name);
    } else {
        throw \`找不到卡片：\${abs_name\}\`;
    }
}`;

fs.writeFileSync("src/generate_card.ts", txt);
