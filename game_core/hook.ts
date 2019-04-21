import { throwDevError } from "./errors";

// TODO: 想辦法避免兩條鏈循環呼叫！
// 例如：「所有戰鬥職位為戰士者戰力+2」，會導致戰力鏈呼叫戰鬥職位鏈，而戰鬥職位鏈本來就會呼叫戰力鏈！

type GetterFunc<T, U>
    = (var_arg: T, const_arg: U) => { var_arg?: T, break_chain?: boolean }|void;
type GetterHook<T, U> = {
    isActive: () => boolean;
    func: GetterFunc<T, U>;
};

class GetterChain<T, U> {
    private list = new Array<GetterHook<T, U>>();
    public append(func: GetterFunc<T, U>, isActive=() => true) {
        let h = { isActive, func };
        this.list.push(h);
    }
    public dominant(func: GetterFunc<T, U>, isActive=() => true) {
        let h = { isActive, func };
        this.list = [h, ...this.list];
    }
    public triggerFullResult(var_arg: T, const_arg: U) {
        for(let hook of this.list) {
            if(hook.isActive()) {
                let result = hook.func(var_arg, const_arg);
                if(result) {
                    if(typeof result.var_arg != "undefined") {
                        var_arg = result.var_arg;
                    }
                    if(result.break_chain) {
                        return { var_arg, break_chain: true };
                    }
                }
            }
        }
        return { var_arg };
    }
    public trigger(var_arg: T, const_arg: U) {
        return this.triggerFullResult(var_arg, const_arg).var_arg;
    }
    public chain<V>(next_chain: GetterChain<T, V>, next_arg: V) {
        let new_chain = new GetterChain<T, U>();
        new_chain.append((var_arg, const_arg) => {
            return this.triggerFullResult(var_arg, const_arg);
        });
        new_chain.append((var_arg, const_arg) => {
            return next_chain.triggerFullResult(var_arg, next_arg);
        });
        return new_chain;
    }
}

type CallBack = (() => void)|(() => Promise<void>);
type ActionResult = {
    intercept_effect?: boolean
    after_effect?: (() => void|Promise<void>)|Array<() => void|Promise<void>>,
    break_chain?: boolean,
};
type ActionFunc<U>
    = (const_arg: U) => void | ActionResult | Promise<ActionResult|void>
type ActionHook<U> = {
    isActive: () => boolean;
    func: ActionFunc<U>
};

class ActionChain<U> {
    private action_list = new Array<ActionHook<U>>();
    private check_chain = new GetterChain<boolean, U>();

    public append(func: ActionFunc<U>, isActive=() => true) {
        let h = { func, isActive };
        this.action_list.push(h);
    }
    public dominant(func: ActionFunc<U>, isActive=() => true) {
        let h = { func, isActive };
        this.action_list = [h, ...this.action_list];
    }
    public appendCheck(func: GetterFunc<boolean, U>, isActive=() => true) {
        this.check_chain.append(func, isActive);
    }
    public dominantCheck(func: GetterFunc<boolean, U>, isActive=() => true) {
        this.check_chain.dominant(func, isActive);
    }
    private async triggerFullActionResult(const_arg: U): Promise<ActionResult> {
        if(this.by_keeper) {
            this.keeperCallback(const_arg);
        }
        this.by_keeper = false;

        let after_effect = new Array<() => void|Promise<void>>();
        let break_chain = false;
        let intercept_effect = false;
        for(let hook of this.action_list) {
            if(hook.isActive()) {
                let _result = hook.func(const_arg);
                if(_result) {
                    let result = await Promise.resolve(_result);
                    if(result) {
                        if(result.after_effect) {
                            if(result.after_effect instanceof Array) {
                                after_effect = [...after_effect, ...result.after_effect];
                            } else {
                                after_effect.push(result.after_effect);
                            }
                        }
                        if(result.break_chain) {
                            break_chain = true;
                            break;
                        } else if(result.intercept_effect) {
                            intercept_effect = true;
                            break;
                        }
                    }
                }
            }
        }
        return { intercept_effect, break_chain, after_effect };
    }
    public checkCanTrigger(const_arg: U) {
        return this.check_chain.trigger(true, const_arg);
    }
    /**
     * 注意！！
     * 現在觸發行動前不會打包在一起檢查了，記得要手動檢查。
     * 為什麼不打包在一起？例如：我推進事件時會檢查角色有沒有疲勞，但實際推進時角色已經疲勞了。
     * 為什麼不先推進完再使角色疲勞？因為我希望 after_effect 是整個事件中最後執行的東西。
     */
    public async trigger(const_arg: U, callback?: CallBack, cleanup?: CallBack) {
        let res = await (this.triggerFullActionResult(const_arg));
        if(res.intercept_effect) {
            if(cleanup) {
                await Promise.resolve(cleanup());
            }
            return false;
        } else {
            if(callback) {
                await Promise.resolve(callback());
            }
            if(res.after_effect instanceof Array) {
                for(let effect of res.after_effect) {
                    await Promise.resolve(effect());
                }
            }
            return true;
        }
    }
    public chain<V>(next_chain: ActionChain<V>, next_arg: V): ActionChain<U> {
        let new_chain = new ActionChain<U>();
        new_chain.appendCheck((var_arg, const_arg) => {
            return this.check_chain.triggerFullResult(var_arg, const_arg);
        });
        new_chain.appendCheck((var_arg, const_arg) => {
            return next_chain.check_chain.triggerFullResult(var_arg, next_arg);
        });
        new_chain.append(const_arg => {
            return this.byKeeper(this.by_keeper)
            .triggerFullActionResult(const_arg);
        });
        new_chain.append(const_arg => {
            return next_chain.byKeeper(this.by_keeper)
            .triggerFullActionResult(next_arg);
        });
        return new_chain;
    }

    private keeperCallback = (const_arg: U) => { };
    public setKeeperCallback(callback: (const_arg: U) => void) {
        this.keeperCallback = callback;
    }

    private by_keeper = false;

    public byKeeper(by_keeper=true) {
        this.by_keeper = true;
        return this;
    }
}

export { ActionChain, GetterChain, GetterFunc, ActionFunc };