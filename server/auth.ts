import { Request } from "express";
import crypto from "crypto";
import * as db from "./database";

export function getUserId(req: Request): string | null;
export function getUserId(req: Request, get_obj: true): Promise<db.IUser | null>;
export function getUserId(req: Request, get_obj?: true) {
    if(get_obj) {
        let userid = getUserId(req);
        return new Promise<db.IUser|null>((resolve, reject) => {
            if(userid) {
                db.User.findOne({ userid })
                .then(user => resolve(user));
            } else {
                resolve(null);
            }
        });
    } else {
        if(req.session && typeof req.session.userid == "string") {
            return req.session.userid;
        }
        return null;
    }
}

export function setUserId(req: Request, userid?: string) {
    new Promise<void>((resolve, reject) => {
        if(req.session) {
            if(userid) {
                req.session.userid = userid;
                req.session.save(err => {
                    if(err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                req.destroy();
                resolve();
            }
        } else {
            reject("session出問題");
        }
    });
}

export function encryptBySalt(salt: string, plain_pass: string) {
    return new Promise<string>((resolve, reject) => {
        crypto.pbkdf2(plain_pass, salt, 4096, 256, "sha512", (err, buff_pass) => {
            if(err) {
                reject(err);
            } else {
                let password = buff_pass.toString("hex");
                resolve(password);
            }
        });
    });
}

export function genSaltAndPass(plain_pass: string) {
    return new Promise<{ salt: string, password: string }>((resolve, reject) => {
        crypto.randomBytes(128, function (err, buff_salt) {
            if(err) {
                reject(err);
            }
            let salt = buff_salt.toString("hex");
            encryptBySalt(salt, plain_pass).then(password => {
                resolve({ password, salt });
            }).catch(err => {
                reject(err);
            });
        });
    });
}

export function checkUser(userid: string, password: string) {
    if(userid.match(/( |\n)/)) {
        return false;
    } else if(userid.length > 0 && password.length > 0) {
        return true;
    }
}