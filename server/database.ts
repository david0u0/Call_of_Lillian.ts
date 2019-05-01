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

interface IUser extends mongoose.Document {
    userid: string,
    password: string,
    salt: string,
}
const User = mongoose.model<IUser>("User", new Schema({
    userid: { type: Types.String, required: true },
    password: { type: Types.String, required: true },
    salt: { type: Types.String, required: true },
}));

export { User };