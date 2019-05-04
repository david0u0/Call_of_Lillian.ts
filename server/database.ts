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

type DBObj<T> = T & mongoose.Document;

interface IDeck {
    name: string,
    description?: string,
    list: { abs_name: string, count: number }[],
    _id?: any
}
const deck_schema = new Schema({
    name: { required: true, type: Types.String },
    description: { default: "", type: Types.String },
    list: {
        default: [],
        type: [{
            abs_name: { type: Types.String, required: true },
            count: { type: Types.Number, required: true },
        }]
    }
});
const Deck = mongoose.model<DBObj<IDeck>>("Deck", deck_schema);

interface IUser {
    userid: string,
    password: string,
    salt: string,
    decks: IDeck[]
}
const User = mongoose.model<DBObj<IUser>>("User", new Schema({
    userid: { type: Types.String, required: true },
    password: { type: Types.String, required: true },
    salt: { type: Types.String, required: true },
    decks: { type: [deck_schema], default: [] },
}));

export { DBObj, User, IUser, Deck, IDeck };