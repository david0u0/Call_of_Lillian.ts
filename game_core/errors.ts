const MODE = (() => {
    let mode = process.env["mode"];
    if(mode) {
        if(mode == "release") {
            return "RELEASE";
        } else if(mode == "test") {
            return "TEST";
        }
    }
    return "DEV";
})();

const ENV = (() => {
    if(typeof window == "undefined") {
        return "backend";
    } else {
        return "frontend";
    }
})();

function formatErrMsg(msg: string | null, obj: any) {
    if(obj instanceof Array) {
        for(let o of obj) {
            if(o.name) {
                msg = `${o.name}: ${msg}`;
            }
        }
    } else {
        if(obj && obj.name) {
            msg = `${obj.name}: ${msg}`;
        }
    }
    if(msg) {
        return msg;
    } else {
        return "";
    }
}

/** 發生錯誤操作，理想上應該會被UI檔下來，會出現這個錯誤代表玩家繞過UI直接對伺服器說話 */
export class BadOperationError {
    message = "";
    constructor(message: string | null, obj_with_name?: any) {
        this.message = formatErrMsg(message, obj_with_name);
        if(ENV == "frontend") {
            alert(this.message);
        }
        Error.apply(this, [this.message]);
    }
}

/** 這個錯誤不一定會影響遊戲進行，但可能代表了潛在的問題 */
export function throwDebugError(msg: string, obj_with_name?: any) {
    console.log(formatErrMsg(msg, obj_with_name));
    if(MODE == "TEST") {
        throw new BadOperationError(msg, obj_with_name);
    }
}

/** 如果是後端就噴錯誤，如果是前端就只是擋下UI */
export function throwIfIsBackend(msg: string | null, obj_with_name?: any) {
    if(ENV == "backend") {
        throw new BadOperationError(msg, obj_with_name);
    } else {
        msg = formatErrMsg(msg, obj_with_name);
        console.log(msg);
    }
}

