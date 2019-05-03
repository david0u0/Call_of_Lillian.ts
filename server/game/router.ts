import express from "express";

import * as db from "../database";

let router = express.Router();

router.post("/init", (req, res) => {
    console.log(req.body);
    res.json({ success: true });
});

export default router;