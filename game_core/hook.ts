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
    var_arg?: T,
};

type TriggerResult<T> = {
    intercept_effect?: boolean,
    var_arg: T,
};

type HookFunc<T, U> = (var_arg: T, const_arg: U) => HookResult<T>|void;

type Hook<T, U> = {
    active_countdown: number, // 0代表無活性，-1代表永久
    func: HookFunc<T, U>
};

/** NOTE: 所有這些 hook 都是在動作開始前執行，所以是有可能修改動作本身的。 */
class HookChain<T, U> {
    private list: Hook<T, U>[] = [];
    public trigger(var_arg: T, const_arg: U): TriggerResult<T> {
        let intercept_effect = false;
        let break_chain = false;
        for(let h of this.list) {
            if(h.active_countdown != 0) {
                let result = h.func(var_arg, const_arg);
                if(result && !result.was_passed) {
                    if(h.active_countdown > 0) {
                        h.active_countdown--;
                    }
                    if(typeof result.var_arg != "undefined") {
                        var_arg = result.var_arg;
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
        return { intercept_effect, var_arg: var_arg };
    }
    public append(func: HookFunc<T, U>, active_countdown=-1): Hook<T, U> {
        let h = { active_countdown, func };
        this.list.push(h);
        return h;
    }
    public dominant(func: HookFunc<T, U>, active_countdown=-1): Hook<T, U> {
        let h = { active_countdown, func };
        this.list = [h, ...this.list];
        return h;
    }
}
/**
 * checkCanTrigger() 回傳假，代表不會執行 trigger，自然也不會發生任何副作用，在UI層級就該擋下來。
 * tigger() 被攔截效果，代表一連串副作用已然執行，而最後的 callback 卻無法執行。
 */
class EventChain<T, U> {
    private real_chain = new HookChain<T, U>();
    private check_chain = new HookChain<null, U>();
    /**
     * 把一個規則接到鏈的尾端，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行。
     */
    public append(func: HookFunc<T, U>, active_countdown=-1): Hook<T, U> {
        return this.real_chain.append(func, active_countdown);
    }
    /**
     * 把一個規則接到鏈的開頭，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行。
     */
    public dominant(func: HookFunc<T, U>, active_countdown=-1): Hook<T, U> {
        return this.real_chain.dominant(func, active_countdown);
    }
    /**
     * 把一個規則接到驗證鏈的尾端，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行-1。
     */
    public appendCheck(func: (arg: U) => HookResult<null>|void, active_countdown=-1): Hook<null, U> {
        return this.check_chain.append((t, arg) => {
            return func(arg);
        }, active_countdown);
    }
    /**
     * 把一個規則接到驗證鏈的開頭，預設為永久規則。
     * @param func 欲接上的規則
     * @param active_countdown 預設為-1，代表永久執行。
     */
    public dominantCheck(func: (arg: U) => HookResult<null>|void, active_countdown=-1): Hook<null, U> {
        return this.check_chain.dominant((t, arg) => {
            return func(arg);
        }, active_countdown);
    }

    /** 只執行驗證鏈 */
    public checkCanTrigger(const_arg: U): boolean {
        let result = this.check_chain.trigger(null, const_arg);
        if(result.intercept_effect) {
            return false;
        } else {
            return true;
        }
    }
    /** 只執行真正的事件鏈 
     * @param callback 如果沒有被欄截效果就會執行它
     * @param recover 如果效果被攔結就會執行它
    */
    public trigger(var_arg: T, const_arg: U,
        callback=(arg: T) => {}, recover=() => {}
    ): T {
        let result = this.real_chain.trigger(var_arg, const_arg);
        if(!result.intercept_effect) {
            callback(result.var_arg);
        }
        return result.var_arg;
    }
    
    public chain<V>(next_chain: EventChain<T, V>, next_const_arg: V): EventChain<T, U> {
        let combined_chain = new EventChain<T, U>();
        combined_chain.append((var_arg, const_arg) => {
            return this.real_chain.trigger(var_arg, const_arg);
        });
        combined_chain.append((var_arg, const_arg) => {
            return next_chain.real_chain.trigger(var_arg, next_const_arg);
        });
        combined_chain.appendCheck(const_arg => {
            return this.check_chain.trigger(null, const_arg);
        });
        combined_chain.appendCheck(const_arg => {
            return next_chain.check_chain.trigger(null, next_const_arg);
        });
        return combined_chain;
    }
}

export { EventChain, HookResult, HookFunc, Hook };