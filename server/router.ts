import express from "express";

import * as db from "./database";
import { genSaltAndPass, encryptBySalt, checkUser, getUserId, setUserId } from "./auth";

let router = express.Router();

router.get("/user/who", (req, res) => {
    let userid = getUserId(req);
    res.json({ userid });
});

router.post("/user/login", async (req, res) => {
    let { userid, password } = (req.body as { userid?: string, password?: string });
    if(userid && password) {
        let user_in_db = await db.User.findOne({ userid });
        if(user_in_db) {
            let encrypted_pass = await encryptBySalt(user_in_db.salt, password);
            if(encrypted_pass == user_in_db.password) {
                res.json({ success: true });
                await setUserId(req, userid);
                return;
            }
        }
    }
    res.status(401).send("帳號或密碼錯誤");
});
router.get("/user/logout", async (req, res) => {
    if(req.session) {
        req.session.destroy(err => {});
        res.json({ success: true });
    } else {
        res.status(500).send("");
    }
});

router.post("/user/register", async (req, res) => {
    let { userid, password } = (req.body as { userid?: string, password?: string });
    if(userid && password && checkUser(userid, password)) {
        let user_in_db = await db.User.findOne({ userid });
        if(user_in_db) {
            res.status(403).send("帳號已被使用");
        } else {
            let user = {
                userid,
                ...(await genSaltAndPass(password))
            };
            await db.User.create(user);
            res.json({ success: true });
            console.log(`${userid}已註冊！`);
            await setUserId(req, userid);
        }
    } else {
        res.status(401).send("帳號或密碼不合法");
    }
});

router.get("/deck/list", async (req, res) => {
    let user = await getUserId(req, true);
    if(user) {
        let decks = user.decks.map(ideck => {
            return {
                name: ideck.name,
                description: ideck.description,
                list: ideck.list,
                id: ideck.id
            };
        });
        res.json(decks);
    } else {
        res.status(403).send("尚未登入");
    }
});
router.get("/deck/detail", async (req, res) => {

});
router.post("/deck/new", async (req, res) => {
    let user = await getUserId(req, true);
    let { name } = (req.body as { name?: string });
    if(user) {
        let deck = await db.Deck.create({ name });
        user.decks.push(deck);
        user.save();
        res.json({ id: deck._id, name: deck.name });
    } else {
        res.status(403).send("尚未登入");
    }
});

export default router;