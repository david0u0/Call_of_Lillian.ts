import path from "path";
import * as bodyParser from "body-parser";
import express from "express";
import session from "express-session";

import * as config from "./config";
import my_router from "./router";
import { getUserId } from "./auth";

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