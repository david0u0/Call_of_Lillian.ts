import { ICard } from "./interface";

const ENV = "backend";

/** 發生錯誤操作，理想上應該會被UI檔下來，會出現這個錯誤代表玩家繞過UI直接對伺服器說話 */
export class BadOperationError {
    message = "";
    constructor(message: string, card?: ICard) {
        if(card) {
            message = `${card.name}: ${message}`;
        }
        this.message = message;
        Error.apply(this, [message]);
    }
}

// 如果是後端就噴錯誤，如果是前端就只是擋下UI
export function throwIfIsBackend(msg: string, card?: ICard) {
    if(ENV == "backend") {
        throw new BadOperationError(msg, card);
    } else {
        console.log(msg)
    }
}
