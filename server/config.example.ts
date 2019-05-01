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

const normalOptions = {
    reconnectTries: Number.MAX_VALUE,
};

const test_server = {
    url: "mongodb://127.0.0.1/Lillian-TEST",
    options: normalOptions
};
const dev_server = {
    url: "mongodb://127.0.0.1/Lillian-DEV",
    options: normalOptions
};
const release_server = {
    url: "mongodb://127.0.0.1/Lillian",
    options: normalOptions
};
const COOKIE_MAX_AGE = 15 * 24 * 60 * 60 * 1000; // 十五天;
const SESSION_SECRECT_KEY = "FIXME: 請修改本金鑰^Q^";
const PORT = 8888;

export {
    test_server,
    dev_server,
    release_server,
    COOKIE_MAX_AGE,
    SESSION_SECRECT_KEY,
    PORT,
    MODE
};