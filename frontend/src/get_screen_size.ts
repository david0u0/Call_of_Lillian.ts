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
