import { throwDebugError } from "./errors";
import { RuleEnums } from "./enums";

const MASK_ALL = RuleEnums.Any;

// TODO: 想辦法避免兩條鏈循環呼叫！
// 例如：「所有戰鬥職位為戰士者戰力+2」，會導致戰力鏈呼叫戰鬥職位鏈，而戰鬥職位鏈本來就會呼叫戰力鏈！

type GetterResult<T> = {
    var_arg?: T,
    mask_id?: number[] | number
};
type GetterFunc<T, U>
    = (var_arg: T, const_arg: U) => GetterResult<T> | void;
type GetterHook<T, U> = {
    isActive: () => boolean,
    func: GetterFunc<T, U>,
    is_default?: boolean,
    id?: number,
};
type AfterEffectFunc = () => void | Promise<void>
type AfterEffectObj = { func: AfterEffectFunc, id?: number, is_default?: boolean };
type ActionResult = {
    intercept_effect?: boolean,
    after_effect?: AfterEffectFunc,
    mask_id?: number[] | number
};
type ActionFunc<U>
    = (const_arg: U, nonce?: number) => void | ActionResult | Promise<ActionResult|void>
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
    private add(append: boolean, is_default: boolean,
        func: GetterFunc<T, U>, isActive = () => true, id?: number
    ) {
        let h = { isActive, func, id, is_default };
        if(append) {
            this.list.push(h);
        } else {
            this.list = [h, ...this.list];
        }
        return this;
    }
    public append(func: GetterFunc<T, U>, isActive=() => true, id?: number) {
        return this.add(true, false, func, isActive);
    }
    public dominant(func: GetterFunc<T, U>, isActive=() => true, id?: number) {
        return this.add(false, false, func, isActive);
    }
    public appendDefault(func: GetterFunc<T, U>, isActive=() => true, id?: number) {
        return this.add(true, true, func, isActive);
    }
    public dominantDefault(func: GetterFunc<T, U>, isActive=() => true, id?: number) {
        return this.add(false, true, func, isActive);
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

type CallBack = ((nonce?: number) => void)|(() => Promise<void>);
type CheckFunc<U> = (const_arg: U, nonce?: number) => GetterResult<string | false>|void;
class ActionChain<U> {
    private action_list = new Array<ActionHook<U>>();
    private check_chain = new GetterChain<string | boolean, U>();

    private add(append: boolean, is_default: boolean,
        func: ActionFunc<U>, isActive=() => true, id?: number
    ) {
        let h = { func, isActive, id, is_default };
        if(append) {
            this.action_list.push(h);
        } else {
            this.action_list = [h, ...this.action_list];
        }
        return this;
    }
    private _err_msg = "";
    private addCheck(append: boolean, is_default: boolean,
        check_func: CheckFunc<U>,
        isActive = () => true, id?: number
    ) {
        let func: GetterFunc<string | boolean, U> = (var_arg, const_arg) => {
            if(typeof var_arg == "boolean" && var_arg) {
                return check_func(const_arg);
            } else if(typeof var_arg == "string") {
                this._err_msg = var_arg;
            }
            return { mask_id: MASK_ALL }; // 一有地方出錯就整條斷掉
        };
        if(append) {
            if(is_default) {
                this.check_chain.appendDefault(func, isActive, id);
            } else {
                this.check_chain.append(func, isActive, id);
            }
        } else {
            if(is_default) {
                this.check_chain.dominantDefault(func, isActive, id);
            } else {
                this.check_chain.dominant(func, isActive, id);
            }
        }
        return this;
    }
    public append(func: ActionFunc<U>, isActive=() => true, id?: number) {
        return this.add(true, false, func, isActive, id);
    }
    public dominant(func: ActionFunc<U>, isActive=() => true, id?: number) {
        return this.add(false, false, func, isActive, id);
    }
    public appendDefault(func: ActionFunc<U>, isActive=() => true) {
        return this.add(true, true, func, isActive);
    }
    public dominantDefault(func: ActionFunc<U>, isActive=() => true) {
        return this.add(true, true, func, isActive);
    }
    public appendCheck(func: CheckFunc<U>, isActive = () => true, id?: number) {
        return this.addCheck(true, false, func, isActive, id);
    }
    public dominantCheck(func: CheckFunc<U>, isActive = () => true, id?: number) {
        return this.addCheck(false, false, func, isActive, id);
    }
    public appendCheckDefaul(func: CheckFunc<U>, isActive = () => true, id?: number) {
        return this.addCheck(true, true, func, isActive, id);
    }
    public dominantCheckDefault(func: CheckFunc<U>, isActive = () => true, id?: number) {
        return this.addCheck(false, true, func, isActive, id);
    }

    public async triggerFullResult(const_arg: U, nonce: number, mask_id: number[] = []): Promise<{
        intercept_effect: boolean,
        mask_id: number[],
        after_effect: AfterEffectObj[]
    }> {
        let after_effect = new Array<AfterEffectObj>();
        let intercept_effect = false;
        for(let hook of this.action_list) {
            // 如果是默認的事件，不會被 mask 影響
            if(checkActive(hook, mask_id) || hook.is_default) {
                let _result = hook.func(const_arg, nonce);
                if(_result) {
                    let result = await Promise.resolve(_result);
                    if(result) {
                        if(result.after_effect) {
                            let effect = result.after_effect;
                            after_effect.push({
                                func: effect,
                                id: hook.id,
                                is_default: hook.is_default
                            });
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
        this._err_msg = "";
        let res = this.check_chain.trigger(true, const_arg);
        if(typeof res == "string") {
            this._err_msg = res;
            return false;
        } else {
            return true;
        }
    }
    /**
     * @param const_arg 固定的參數
     * @param nonce 在時間中唯一的數值，用來處理多條鏈之間交互作用。
     * 例如：用一條 before_action_chain 設置了一些會在 action_chain 中使用的參數，但不希望這些參數被重複使用。
     * 可以記下這些參數與當前 nonce 的關聯，下次再呼叫 action_chain 由於 nonce 不同，自然就避免了重複使用。
     * @param callback 
     * @param mask_id 
     */
    public async trigger(const_arg: U, nonce: number, callback?: CallBack, mask_id=[]) {
        if(this.by_keeper) {
            await this.keeperCallback(const_arg);
        }
        this.by_keeper = false;

        let res = await (this.triggerFullResult(const_arg, nonce, mask_id));
        if(res.intercept_effect) {
        } else {
            if(callback) {
                await Promise.resolve(callback());
            }
            for(let effect of res.after_effect) {
                if(res.mask_id.indexOf(MASK_ALL) != -1 && !effect.is_default) {
                    // do nothing
                } else if(typeof effect.id == "number" && res.mask_id.indexOf(effect.id) == -1) {
                    await Promise.resolve(effect.func());
                }
            }
        }
        await Promise.resolve(this.defaultAfterEffect());
        return !res.intercept_effect;
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
        new_chain.setKeeperCallback(async arg => {
            await this.keeperCallback(arg);
            await next_chain.keeperCallback(next_arg);
        });

        return new_chain;
    }

    private keeperCallback: (const_arg: U) => Promise<void> | void = () => { };
    public setKeeperCallback(callback: (const_arg: U) => Promise<void> | void) {
        this.keeperCallback = callback;
    }

    private by_keeper = false;
    public byKeeper(by_keeper=true) {
        this.by_keeper = by_keeper;
        return this;
    }

    private defaultAfterEffect: () => Promise<void> | void = () => { };
    public setDefaultAfterEffect(effect: () => Promise<void> | void) {
        this.defaultAfterEffect = effect;
    }
}

export { ActionChain, GetterChain, GetterFunc, ActionFunc, CheckFunc };