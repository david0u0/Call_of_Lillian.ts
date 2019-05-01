import express from "express";

import * as db from "./database";
import { genSaltAndPass, encryptBySalt, checkUser } from "./auth";

let router = express.Router();

router.get("/user/who", (req, res) => {
    if(req.session && req.session["userid"]) {
        res.json({ userid: req.session["userid"] });
    } else {
        res.json({ userid: null });
    }
});

router.post("/user/login", async (req, res) => {
    let { userid, password } = (req.body as { userid?: string, password?: string });
    if(userid && password) {
        let user_in_db = await db.User.findOne({ userid });
        if(user_in_db) {
            let encrypted_pass = await encryptBySalt(user_in_db.salt, password);
            if(encrypted_pass == user_in_db.password) {
                res.json({ success: true });
                console.log(`${userid}已登入！`);
                if(req.session) {
                    req.session.userid = userid;
                    req.session.save(err => {});
                }
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
            if(req.session) {
                req.session["userid"] = userid;
            }
        }
    } else {
        res.status(401).send("帳號或密碼不合法");
    }
});

export default router;