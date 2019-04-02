import * as assert from "assert";
import { BadOperationError } from "../errors";

export function checkBadOperationError(func: () => void) {
    let error_caught = true;
    try {
        func();
        error_caught = false;
    } catch (e) {
        if(!(e instanceof BadOperationError)) {
            assert.fail(`抓到不正確的錯誤：${e.message}`);
        }
    }
    if(!error_caught) {
        assert.fail("沒有抓到錯誤");
    }
}

export async function checkBadOperationErrorAsync(func: () => Promise<any>) {
    let error_caught = true;
    try {
        await func();
        error_caught = false;
    } catch (e) {
        if(!(e instanceof BadOperationError)) {
            assert.fail(`抓到不正確的錯誤：${e.message}`);
        }
    }
    if(!error_caught) {
        assert.fail("沒有抓到錯誤");
    }
}
