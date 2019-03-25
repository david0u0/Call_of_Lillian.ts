import express from "express";

let app = express();

app.use(express.static("frontend/dist"));

app.listen(8080);