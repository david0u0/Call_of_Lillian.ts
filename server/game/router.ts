import express from "express";

import * as config from "../config";
import * as db from "../database";
import { getUserId } from "../auth";
import { Player } from "../../game_core/enums";

let router = express.Router();
let game_setup_table: {
    [userid: string]: {
        mode: "DEV" | "RELEASE" | "TEST",
        info1: {
            // TODO: 守護者卡牌
            player: Player,
            userid: string,
            deck: db.IDeck
        },
        info2: {
            // TODO: 守護者卡牌
            player: Player,
            userid: string,
            deck: db.IDeck
        },
    }
} = {};

router.post("/init", async (req, res) => {
    let user = await getUserId(req, true);
    if(user) {
        let { my_deck_id, enemy_deck_id } = req.body;
        let my_deck = user.decks.find(deck => deck._id == my_deck_id);
        let enemy_deck = user.decks.find(deck => deck._id == enemy_deck_id);
        if(my_deck && enemy_deck) {
            let userid = user.userid;
            game_setup_table[userid] = {
                mode: config.MODE,
                info1: { player: Player.Player1, userid, deck: my_deck },
                info2: { player: Player.Player2, userid, deck: enemy_deck }
            };
            res.send({ success: true });
            return;
        }
    }
    res.status(500).send();
});
router.get("/decks", (req, res) => {
    let userid = getUserId(req);
    if(userid) {
        // TODO: 馬掉敵人的牌組，只留張數
        res.json(game_setup_table[userid]);
    } else {
        res.status(500).send();
    }
});

export default router;