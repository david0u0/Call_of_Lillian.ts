export function parseName(name: any, strict = false): string | undefined {
    if(typeof name == "string") {
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