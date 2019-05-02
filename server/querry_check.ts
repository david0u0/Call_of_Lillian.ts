export function parseName(name: string | undefined, strict = false): string | undefined {
    if(name) {
        if(strict && name.match(/[ |\n]/)) {
            return undefined;
        } else {
            name = name.replace(/[ |\n]+/g, " ").replace(/^ /, "").replace(/ $/, "");
            if(name.length > 0) {
                return name;
            }
        }
    }
    return undefined;
}