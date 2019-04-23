import { ActionChain } from "../hook";

export class ActionChainFactory {
    private callback_chain = new ActionChain<null>();
    private callbacks = new Array<() => Promise<void>|void>();
    setAfterEffect(func: () => Promise<void> | void, isActive = () => true) {
        this.callback_chain.append(t => {
            return { after_effect: func };
        }, isActive);
    }
    new<U>() {
        let chain = new ActionChain<U>();
        chain.append(async () => {
            let result = await this.callback_chain.triggerFullResult(null);
            return { after_effect: result.after_effect };
        });
        return chain;
    }
}