// TODO: 想辦法避免兩條鏈循環呼叫！
// 例如：「所有戰鬥職位為戰士者戰力+2」，會導致戰力鏈呼叫戰鬥職位鏈，而戰鬥職位鏈本來就會呼叫戰力鏈！

/**
 * 注意此處的 intercept_effect 不是像魔不夠這種限制，而是特殊效果，例如「某個角色不會退場」之類。
 * 魔不夠這類的限制應該在進入事件鏈之前就被擋下來了。
 */
type HookResult<T> = {
    was_passed?: boolean,
    break_chain?: boolean,
    intercept_effect?: boolean,
    result_arg?: T,
};

type Hook<T> = {
    active_countdown: number, // 0代表無活性，-1代表永久
    func: (arg: T) => HookResult<T>|void
};

/** NOTE: 所有這些 hook 都是在動作開始前執行，所以是有可能修改動作本身的。 */
class HookChain<T> {
    private list: Hook<T>[] = [];
    public trigger(arg: T): { result_arg: T, intercept_effect: boolean, break_chain: boolean } {
        let intercept_effect = false;
        let break_chain = false;
        for(let h of this.list) {
            if(h.active_countdown != 0) {
                let result = h.func(arg);
                if(result && !result.was_passed) {
                    if(h.active_countdown > 0) {
                        h.active_countdown--;
                    }
                    if(typeof result.result_arg != "undefined") {
                        arg = result.result_arg;
                    }

                    if(result.intercept_effect) {
                        intercept_effect = true;
                        break;
                    } else if(result.break_chain) {
                        break_chain = true;
                        break;
                    }
                }
            }
        }
        return { intercept_effect, break_chain, result_arg: arg };
    }
    public append(func: (arg: T) => HookResult<T>|void, active_countdown=1): Hook<T> {
        let h = { active_countdown, func };
        this.list.push(h);
        return h;
    }
    public dominant(func: (arg: T) => HookResult<T>|void, active_countdown=1): Hook<T> {
        let h = { active_countdown, func };
        this.list = [h, ...this.list];
        return h;
    }
}
class EventChain<T> {
    private real_chain = new HookChain<T>();
    private check_chain = new HookChain<T>();
    /**
     * 把一個規則接到鏈的尾端，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行。
     */
    public append(func: (arg: T) => HookResult<T>|void, active_countdown=-1): Hook<T> {
        return this.real_chain.append(func, active_countdown);
    }
    /**
     * 把一個規則接到鏈的開頭，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行。
     */
    public dominant(func: (arg: T) => HookResult<T>|void, active_countdown=-1): Hook<T> {
        return this.real_chain.dominant(func, active_countdown);
    }
    /**
     * 把一個規則接到驗證鏈的尾端，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行-1。
     */
    public appendCheck(func: (arg: T) => HookResult<T>|void, active_countdown=-1): Hook<T> {
        return this.check_chain.append(func, active_countdown);
    }
    /**
     * 把一個規則接到驗證鏈的開頭，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行。
     */
    public dominantCheck(func: (arg: T) => HookResult<T>|void, active_countdown=-1): Hook<T> {
        return this.check_chain.dominant(func, active_countdown);
    }

    /** 只執行驗證鏈 */
    public checkCanTrigger(arg: T): boolean {
        let result = this.check_chain.trigger(arg);
        if(result.intercept_effect) {
            return false;
        } else {
            return true;
        }
    }
    /** 執行真正的事件鏈之前會先執行驗證鏈 */
    public trigger(arg: T): { result_arg: T, intercept_effect: boolean, break_chain: boolean } {
        if(this.checkCanTrigger(arg)) {
            return this.real_chain.trigger(arg);
        } else {
            return { result_arg: arg, intercept_effect: true, break_chain: true };
        }
    }
    public chain<U>(next_chain: EventChain<U>,
        trans_func1: (result: T) => U, trans_func2: (result: U) => T
    ): EventChain<T> {
        let combined_chain = new EventChain<T>();
        combined_chain.append(arg => {
            return this.real_chain.trigger(arg);
        });
        combined_chain.append(arg => {
            let new_arg = trans_func1(arg);
            let result = next_chain.real_chain.trigger(new_arg);
            let result_arg = trans_func2(result.result_arg);
            return {
                result_arg,
                break_chain: result.break_chain,
                intercept_effect: result.intercept_effect
            };
        });
        combined_chain.appendCheck(arg => {
            return this.check_chain.trigger(arg);
        });
        combined_chain.appendCheck(arg => {
            let new_arg = trans_func1(arg);
            let result = next_chain.check_chain.trigger(new_arg);
            let result_arg = trans_func2(result.result_arg);
            return {
                result_arg,
                break_chain: result.break_chain,
                intercept_effect: result.intercept_effect
            };
        });
        return combined_chain;
    }
}

export { EventChain, HookResult };