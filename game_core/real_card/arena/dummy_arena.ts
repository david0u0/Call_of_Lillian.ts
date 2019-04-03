import { Arena } from "../../cards";
import { ActionChain } from "../../hook";
import { ICharacter } from "../../interface";
import { Player } from "../../enums";
import { Constant } from "../../general_rules";

export default class A extends Arena {
    name = Constant.DUMMY_NAME;
    description = "遊戲最初的場地，不可開發。";
    basic_exploit_cost = 0;
    basic_mana_cost = 0;
    exploit_chain = (() => {
        let chain = new ActionChain<ICharacter|Player>();
        chain.dominantCheck(() => {
            return { var_arg: false };
        });
        return chain;
    })();
    onExploit() {}
}