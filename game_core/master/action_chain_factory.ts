import { ActionChain } from "../hook";

export class ActionChainFactory {
    private callback_chain = new ActionChain<null>();
    setAfterEffect(func: () => void | Promise<void>, isActive = () => true) {
        this.callback_chain.append(async t => {
            await func();
        }, isActive);
    }
    new<U>() {
        let chain = new ActionChain<U>();
        chain.setDefaultAfterEffect(async () => {
            await this.callback_chain.trigger(null, 0);
        });
        return chain;
    }
}