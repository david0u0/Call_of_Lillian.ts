import mongoose, { mongo } from "mongoose";
const Schema = mongoose.Schema;
const Types = mongoose.SchemaTypes;

import * as config from "./config";

let server = (() => {
    switch(config.MODE) {
        case "TEST":
            return config.test_server;
        case "DEV":
            return config.dev_server;
        case "RELEASE":
            return config.release_server;
    }
})();

mongoose.connect(server.url, server.options)
.then(() => {
    console.log("資料庫連結成功");
}).catch(err => {
    console.log("資料庫連結失敗");
});

interface IDeck extends mongoose.Document {
    name: string,
    description: string,
    list: { name: string, count: number }
}
const deck_schema = new Schema({
    name: { required: true, type: Types.String },
    description: { type: Types.String },
    list: {
        required: true,
        default: [],
        type: [{
            name: { type: Types.String, required: true },
            count: { type: Types.Number, required: true },
        }]
    }
});
const Deck = mongoose.model<IDeck>("Deck", deck_schema);

interface IUser extends mongoose.Document {
    userid: string,
    password: string,
    salt: string,
    decks: [IDeck]
}
const User = mongoose.model<IUser>("User", new Schema({
    userid: { type: Types.String, required: true },
    password: { type: Types.String, required: true },
    salt: { type: Types.String, required: true },
    decks: { type: [deck_schema], required: true, default: [] },
}));

export { User, IUser, Deck };