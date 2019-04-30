import { throwDebugError } from "./errors";

// TODO: 想辦法避免兩條鏈循環呼叫！
// 例如：「所有戰鬥職位為戰士者戰力+2」，會導致戰力鏈呼叫戰鬥職位鏈，而戰鬥職位鏈本來就會呼叫戰力鏈！

const MASK_ALL = 1;

type GetterResult<T> = {
    var_arg?: T,
    mask_id?: number[] | number
};
type GetterFunc<T, U>
    = (var_arg: T, const_arg: U) => GetterResult<T> | void;
type GetterHook<T, U> = {
    isActive: () => boolean;
    func: GetterFunc<T, U>;
    id?: number;
};
type AfterEffectFunc = () => void | Promise<void>
type AfterEffectObj = { func: AfterEffectFunc, id: number } | AfterEffectFunc;
type ActionResult = {
    intercept_effect?: boolean,
    after_effect?: AfterEffectFunc,
    mask_id?: number[] | number
};
type ActionFunc<U>
    = (const_arg: U) => void | ActionResult | Promise<ActionResult|void>
type ActionHook<U> = {
    isActive: () => boolean;
    func: ActionFunc<U>;
    is_default?: boolean,
    id?: number
};
function checkActive(h: ActionHook<any> | GetterHook<any, any>, mask_id: number[]) {
    if(typeof(h.id) != "undefined" && mask_id.indexOf(h.id) != -1) {
        return false;
    } else if(mask_id.indexOf(MASK_ALL) != -1) {
        return false;
    } else {
        return h.isActive();
    }
}

class GetterChain<T, U> {
    private list = new Array<GetterHook<T, U>>();
    public append(func: GetterFunc<T, U>, isActive=() => true, id?: number) {
        let h = { isActive, func, id };
        this.list.push(h);
    }
    public dominant(func: GetterFunc<T, U>, isActive=() => true, id?: number) {
        let h = { isActive, func, id };
        this.list = [h, ...this.list];
    }
    public triggerFullResult(var_arg: T, const_arg: U, mask_id: number[] = []) {
        for(let hook of this.list) {
            if(checkActive(hook, mask_id)) {
                let result = hook.func(var_arg, const_arg);
                if(result) {
                    if(typeof result.var_arg != "undefined") {
                        var_arg = result.var_arg;
                    }
                    if(typeof result.mask_id != "undefined") {
                        if(typeof result.mask_id == "number") {
                            mask_id.push(result.mask_id);
                        } else {
                            mask_id.concat(result.mask_id);
                        }
                    }
                }
            }
        }
        return { var_arg, mask_id };
    }
    public trigger(var_arg: T, const_arg: U, mask_id: number[] = []) {
        return this.triggerFullResult(var_arg, const_arg, mask_id).var_arg;
    }
    public chain<V>(next_chain: GetterChain<T, V>, next_arg: V) {
        let new_chain = new GetterChain<T, U>();
        new_chain.list = [...this.list];
        for(let h of next_chain.list) {
            new_chain.list.push({
                isActive: h.isActive,
                id: h.id,
                func: (var_arg: T) => {
                    return h.func(var_arg, next_arg);
                }
            });
        }
        return new_chain;
    }
}

type CallBack = (() => void)|(() => Promise<void>);

class ActionChain<U> {
    private action_list = new Array<ActionHook<U>>();
    private check_chain = new GetterChain<string | boolean, U>();

    public append(func: ActionFunc<U>, isActive=() => true, id?: number) {
        let h = { func, isActive, id };
        this.action_list.push(h);
    }
    public dominant(func: ActionFunc<U>, isActive=() => true, id?: number) {
        let h = { func, isActive, id };
        this.action_list = [h, ...this.action_list];
    }
    public appendDefault(func: ActionFunc<U>, isActive=() => true) {
        let h = { func, isActive, is_default: true };
        this.action_list.push(h);
    }

    private _err_msg = "";
    public appendCheck(func: GetterFunc<string | false, U>, isActive = () => true, id?: number) {
        this.check_chain.append((var_arg, const_arg) => {
            if(typeof var_arg == "boolean" && var_arg) {
                return func(false, const_arg);
            } else if(typeof var_arg == "string") {
                this._err_msg = var_arg;
            }
            return { mask_id: MASK_ALL }; // 一有地方出錯就整條斷掉
        }, isActive, id);
    }
    public dominantCheck(func: GetterFunc<string | false, U>, isActive = () => true, id?: number) {
        this.check_chain.dominant((var_arg, const_arg) => {
            if(typeof var_arg == "boolean" && var_arg) {
                return func(false, const_arg);
            } else if(typeof var_arg == "string") {
                this._err_msg = var_arg;
            }
            return { mask_id: MASK_ALL }; // 一有地方出錯就整條斷掉
        }, isActive, id);
    }
    public async triggerFullResult(const_arg: U, mask_id: number[] = []): Promise<{
        intercept_effect: boolean,
        mask_id: number[],
        after_effect: AfterEffectObj[]
    }> {
        let after_effect = new Array<AfterEffectObj>();
        let intercept_effect = false;
        for(let hook of this.action_list) {
            // 如果是默認的事件，不會被 mask 影響
            if(checkActive(hook, mask_id) || hook.is_default) {
                let _result = hook.func(const_arg);
                if(_result) {
                    let result = await Promise.resolve(_result);
                    if(result) {
                        if(result.after_effect) {
                            let effect = result.after_effect;
                            if(typeof hook.id != "undefined") {
                                after_effect.push({ func: effect, id: hook.id });
                            } else {
                                after_effect.push(effect);
                            }
                        }
                        if(result.intercept_effect) {
                            intercept_effect = true;
                            break;
                        }
                        if(typeof result.mask_id != "undefined") {
                            if(typeof result.mask_id == "number") {
                                mask_id.push(result.mask_id);
                            } else {
                                mask_id.concat(result.mask_id);
                            }
                        }
                    }
                }
            }
        }
        return { intercept_effect, after_effect, mask_id };
    }
    public get err_msg() { return this._err_msg; }
    public checkCanTrigger(const_arg: U) {
        let res = this.check_chain.trigger(true, const_arg);
        if(typeof res == "string") {
            this._err_msg = res;
            return false;
        } else {
            return true;
        }
    }
    /**
     * 注意！！
     * 現在觸發行動前不會打包在一起檢查了，記得要手動檢查。
     * 為什麼不打包在一起？例如：我推進事件時會檢查角色有沒有疲勞，但實際推進時角色已經疲勞了。
     * 為什麼不先推進完再使角色疲勞？因為我希望 after_effect 是整個事件中最後執行的東西。
     */
    public async trigger(const_arg: U, callback?: CallBack, mask_id=[]) {
        if(this.by_keeper) {
            this.keeperCallback(const_arg);
        }
        this.by_keeper = false;

        let res = await (this.triggerFullResult(const_arg, mask_id));
        if(res.intercept_effect) {
            return false;
        } else {
            if(callback) {
                await Promise.resolve(callback());
            }
            if(res.after_effect instanceof Array) {
                for(let effect of res.after_effect) {
                    if(typeof effect == "function") {
                        await Promise.resolve(effect());
                    } else if(res.mask_id.indexOf(effect.id) == -1) {
                        await Promise.resolve(effect.func());
                    }
                }
            } else {
                throw throwDebugError("後期作用不知為何竟然不是個陣列");
            }
            return true;
        }
    }
    public chain<V>(next_chain: ActionChain<V>, next_arg: V): ActionChain<U> {
        let new_chain = new ActionChain<U>();
        new_chain.check_chain = this.check_chain.chain(next_chain.check_chain, next_arg);

        new_chain.action_list = [...this.action_list];
        for(let h of next_chain.action_list) {
            new_chain.action_list.push({
                isActive: h.isActive,
                id: h.id,
                func: () => {
                    return h.func(next_arg);
                }
            });
        }
        new_chain.setKeeperCallback(arg => {
            this.keeperCallback(arg);
            next_chain.keeperCallback(next_arg);
        });

        return new_chain;
    }

    private keeperCallback = (const_arg: U) => { };
    public setKeeperCallback(callback: (const_arg: U) => void) {
        this.keeperCallback = callback;
    }

    private by_keeper = false;
    public byKeeper(by_keeper=true) {
        this.by_keeper = by_keeper;
        return this;
    }
}

export { ActionChain, GetterChain, GetterFunc, ActionFunc, MASK_ALL };