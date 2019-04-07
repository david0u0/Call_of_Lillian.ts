const ENV = (() => {
    if(typeof window == "undefined") {
        return "backend";
    } else {
        return "frontend";
    }
})();

/** 發生錯誤操作，理想上應該會被UI檔下來，會出現這個錯誤代表玩家繞過UI直接對伺服器說話 */
export class BadOperationError {
    message = "";
    constructor(message: string, obj_with_name?: any) {
        if(obj_with_name && obj_with_name.name) {
            message = `${obj_with_name.name}: ${message}`;
        }
        this.message = message;
        if(ENV == "frontend") {
            alert(this.message);
        }
        Error.apply(this, [message]);
    }
}

/** 這個錯誤不一定會影響遊戲進行，但可能代表了潛在的問題 */
export function throwDevError(msg: string, obj_with_name?: any) {
    if(process.env.MODE != "DEV") {
        throw new BadOperationError(msg, obj_with_name);
    }
}

/** 如果是後端就噴錯誤，如果是前端就只是擋下UI */
export function throwIfIsBackend(msg: string, obj_with_name?: any) {
    if(ENV == "backend") {
        throw new BadOperationError(msg, obj_with_name);
    } else {
        if(obj_with_name && obj_with_name.name) {
            msg = `${obj_with_name.name}: ${msg}`;
        }
        alert(msg);
    }
}

