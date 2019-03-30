import express from "express";

let app = express();

app.use("/card_image", express.static("frontend/assets/card_image"));
app.use(express.static("frontend/dist"));

app.listen(8080);