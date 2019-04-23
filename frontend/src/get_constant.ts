import { Player } from "../../game_core/enums";

export function getEltSize() {
    let ew = window.innerWidth/42;
    let eh = window.innerHeight/42;
    return { ew, eh };
}

export function getWinSize() {
    let width = window.innerWidth;
    let height = window.innerHeight;
    return { width, height };
}

export function getPlayerColor(p: Player, heavy: boolean) {
    if(heavy) {
        if(p == Player.Player1) {
            return 0x48e0cf;
        } else {
            return 0xf86390;
        }
    } else {
        if(p == Player.Player1) {
            return 0xdefdf9;
        } else {
            return 0xfcb6cb;
        }
    }
}