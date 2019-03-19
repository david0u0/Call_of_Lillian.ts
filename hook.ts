type HookResult<T> = {
    did_trigger?: boolean,
    break_chain?: boolean,
    intercept_effect?: boolean,
    result_arg?: T,
};

type Hook<T> = {
    active_count: number, // 0代表無活性，-1代表永久
    func: (arg: T) => HookResult<T>|void
};

/** NOTE: 所有這些 hook 都是在動作開始前執行，所以是有可能修改動作本身的。 */
class HookChain<T> {
    private list: Hook<T>[] = [];
    public trigger(arg: T): { result_arg: T, intercept_effect?: boolean } {
        let intercepted = false;
        for(let h of this.list) {
            if(h.active_count != 0) {
                let result = h.func(arg);
                if(result && result.did_trigger) {
                    if(h.active_count > 0) {
                        h.active_count--;
                    }
                    if(typeof result.result_arg != "undefined") {
                        arg = result.result_arg;
                    }

                    if(result.intercept_effect) {
                        intercepted = true;
                        break;
                    } else if(result.break_chain) {
                        break;
                    }
                }
            }
        }
        return { intercept_effect: intercepted, result_arg: arg };
    }
    /**
     * 把一個處理函式接到鏈的尾端。
     * @param func 處理函式
     * @param active_count 預設為1，代表僅執行一次。若要永久執行，應設定為-1。
     */
    public append(func: (arg: T) => HookResult<T>|void, active_count=1): Hook<T> {
        let h = { active_count, func };
        this.list.push(h);
        return h;
    }
    /**
     * 把一個處理函式接到鏈的開頭。
     * @param func 處理函式
     * @param active_count 預設為1，代表僅執行一次。若要永久執行，應設定為-1。
     */
    public dominant(func: (arg: T) => HookResult<T>|void, active_count=1): Hook<T> {
        let h = { active_count, func };
        this.list = [h, ...this.list];
        return h;
    }
}

export { HookChain, HookResult };