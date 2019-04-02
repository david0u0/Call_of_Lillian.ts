import { throwDevError } from "./errors";
import { BadOperationError } from "./game_master";

// TODO: 想辦法避免兩條鏈循環呼叫！
// 例如：「所有戰鬥職位為戰士者戰力+2」，會導致戰力鏈呼叫戰鬥職位鏈，而戰鬥職位鏈本來就會呼叫戰力鏈！
// TODO: 要不要把鏈分為不需要檢查的（如取得戰力）和需要檢查的？

type GetterFunc<T, U>
    = (var_arg: T, const_arg: U) => { var_arg?: T, break_chain?: boolean, was_passed?: boolean }|void;
type GetterHook<T, U> = {
    active_countdown: number, // 0代表無活性，-1代表永久
    func: GetterFunc<T, U>
};

class GetterChain<T, U> {
    private list = new Array<GetterHook<T, U>>();
    public append(func: GetterFunc<T, U>, active_countdown=-1) {
        let h = { active_countdown, func };
        this.list.push(h);
        return h;
    }
    public dominant(func: GetterFunc<T, U>, active_countdown=-1) {
        let h = { active_countdown, func };
        this.list = [h, ...this.list];
        return h;
    }
    public triggerFullResult(var_arg: T, const_arg: U) {
        for(let hook of this.list) {
            if(hook.active_countdown != 0) {
                let result = hook.func(var_arg, const_arg);
                if(result && !result.was_passed) {
                    if(hook.active_countdown > 0) {
                        hook.active_countdown--;
                    }
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
    after_effect?: (() => void)|Array<() => void>,
    break_chain?: boolean,
    was_passed?: boolean
} | void;
type ActionFunc<U>
    = (const_arg: U) => ActionResult | Promise<ActionResult>
type ActionHook<U> = {
    active_countdown: number, // 0代表無活性，-1代表永久
    func: ActionFunc<U>
};

class ActionChain<U> {
    private action_list = new Array<ActionHook<U>>();
    private check_chain = new GetterChain<boolean, U>();

    public append(func: ActionFunc<U>, active_countdown=-1) {
        let h = { func, active_countdown };
        this.action_list.push(h);
        return h;
    }
    public dominant(func: ActionFunc<U>, active_countdown=-1) {
        let h = { func, active_countdown };
        this.action_list = [h, ...this.action_list];
        return h;
    }
    public appendCheck(func: GetterFunc<boolean, U>, active_countdown=-1) {
        return this.check_chain.append(func, active_countdown);
    }
    public dominantCheck(func: GetterFunc<boolean, U>, active_countdown=-1) {
        return this.check_chain.dominant(func, active_countdown);
    }
    private async triggerFullActionResult(const_arg: U) {
        let after_effect = new Array<() => void>();
        let break_chain = false;
        let intercept_effect = false;
        for(let hook of this.action_list) {
            if(hook.active_countdown != 0) {
                let _result = hook.func(const_arg);
                if(_result) {
                    let result = await Promise.resolve(_result);
                    if(result && !result.was_passed) {
                        if(hook.active_countdown > 0) {
                            hook.active_countdown--;
                        }
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
        } else {
            if(callback) {
                await Promise.resolve(callback());
                for(let effect of res.after_effect) {
                    effect();
                }
            }
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
            return this.triggerFullActionResult(const_arg);
        });
        new_chain.append(const_arg => {
            return next_chain.triggerFullActionResult(next_arg);
        });
        return new_chain;
    }
}

export { ActionChain, GetterChain, GetterFunc, ActionFunc };