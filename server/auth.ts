import crypto from "crypto";

export function encryptBySalt(salt: string, plain_pass: string) {
    return new Promise<string>((resolve, reject)=> {
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