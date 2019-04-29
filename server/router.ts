import express from "express";

let router = express.Router();

router.get("/user/who", (req, res) => {
    if(req.session && req.session["userid"]) {
        res.json({ userid: req.session["userid"] });
    } else {
        res.json({ userid: null });
    }
});

router.post("/user/login", (req, res) => {
    let { userid, password } = req.body;
    if(userid == "test") {
        if(req.session) {
            req.session["userid"] = userid;
        }
        res.json({ success: true });
    } else {
        res.status(401).send("帳號或密碼錯誤");
    }
});

router.post("/user/register", (req, res) => {
    let { userid, password } = req.body;
    // TODO:
});

export default router;