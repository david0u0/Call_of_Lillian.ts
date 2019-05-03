import express from "express";

import * as db from "./database";
import { genSaltAndPass, encryptBySalt, checkUser, getUserId, setUserId } from "./auth";
import { card_list } from "./card_generator";
import { parseName } from "./querry_check";

let router = express.Router();

router.get("/user/who", (req, res) => {
    let userid = getUserId(req);
    res.json({ userid });
});

router.post("/user/login", async (req, res) => {
    let { userid, password } = (req.body as db.Query<db.IUser>);
    userid = parseName(userid, true);
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
    let { userid, password } = (req.body as db.Query<db.IUser>);
    userid = parseName(userid, true);
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
                _id: ideck._id
            };
        });
        res.json(decks);
    } else {
        res.status(403).send("尚未登入");
    }
});
router.get("/deck/detail", async (req, res) => {
    let user = await getUserId(req, true);
    let { _id } = (req.query as { _id?: any });
    if(_id && user) {
        for(let deck of user.decks) {
            if(deck._id == _id) {
                res.json({ name: deck.name, list: deck.list, description: deck.description });
                break;
            }
        }
    } else {
        res.status(404).send();
    }
});
router.post("/deck/new", async (req, res) => {
    let user = await getUserId(req, true);
    let { name } = (req.body as { name?: string });
    name = parseName(name);
    if(!name) {
        res.status(400).send("沒有名字");
    } else if(!user) {
        res.status(403).send("尚未登入");
    } else {
        let deck = new db.Deck({ name });
        user.decks.push(deck);
        user.save();
        res.json({ _id: deck._id, name: deck.name });
    }
});
router.post("/deck/edit", async (req, res) => {
    let user = await getUserId(req, true);
    let { name, description, list, _id } = (req.body as db.Query<db.IDeck>);
    name = parseName(name);
    if(!user) {
        res.status(403).send("尚未登入");
    } else if(!_id) {
        res.status(400).send("沒有id");
    } else {
        let deck = user.decks.find(d => d._id == _id);
        if(deck) {
            deck.name = name || deck.name;
            deck.description = description || deck.description;
            deck.list = list || deck.list;
            user.save();
            res.json({ _id: deck._id, name: deck.name, description: deck.description });
        } else {
            res.status(404).send();
        }
    }
});
router.get("/card/list", async (req, res) => {
    res.json(card_list);
});

export default router;