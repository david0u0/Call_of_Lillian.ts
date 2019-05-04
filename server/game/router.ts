import express from "express";

import * as db from "../database";
import { getUserId } from "../auth";

let router = express.Router();
let player_stat_table: {
    [userid: string]: {
        my_deck: db.IDeck,
        enemy_deck: db.IDeck
    }
} = {};

router.post("/init", async (req, res) => {
    let user = await getUserId(req, true);
    if(user) {
        let { my_deck_id, enemy_deck_id } = req.body;
        let my_deck = user.decks.find(deck => deck._id == my_deck_id);
        let enemy_deck = user.decks.find(deck => deck._id == my_deck_id);
        if(my_deck && enemy_deck) {
            player_stat_table[user.userid] = { my_deck, enemy_deck };
            res.send({ success: true });
            return;
        }
    }
    res.status(500).send();
});
router.get("/decks", (req, res) => {
    let userid = getUserId(req);
    if(userid) {
        res.json(player_stat_table[userid]);
    } else {
        res.status(500).send();
    }
});

export default router;