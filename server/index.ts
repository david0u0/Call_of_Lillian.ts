import fs from "fs";
import path from "path";
import * as bodyParser from "body-parser";
import express from "express";
import session from "express-session";

import { KnownCard } from "../game_core/cards";
import { Player } from "../game_core/enums";
import { GameMaster } from "../game_core/master/game_master";

import * as config from "./config";
import my_router from "./router";
import { getUserId } from "./auth";

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

let app = express();
app.use(bodyParser.json());
app.use(session({
    name: "Lillian.sid",
    resave: false,
    saveUninitialized: true,
    secret: config.SESSION_SECRECT_KEY,
    cookie: { maxAge: config.COOKIE_MAX_AGE, secure: false },
    store: new session.MemoryStore()
}));

app.use("/card_image/", express.static("frontend/assets/card_image"));
// NOTE: 首頁一樣會因爲 express.static 而回傳 index.html
app.get(/\/(app\/.*|app)/, function (req, res) {
    res.sendFile(path.resolve("frontend/dist/index.html"));
});
app.get("/game/", function (req, res) {
    if(getUserId(req)) {
        res.sendFile(path.resolve("frontend/dist/game.html"));
    } else {
        res.redirect("/app");
    }
});
app.get("/deck_builder/", function (req, res) {
    if(getUserId(req)) {
        res.sendFile(path.resolve("frontend/dist/deck_builder.html"));
    } else {
        res.redirect("/app");
    }
});

app.get("/", function (req, res) {
    res.redirect("/app");
});

app.use(express.static("frontend/dist"));
app.use("/api/", my_router);

app.listen(config.PORT);