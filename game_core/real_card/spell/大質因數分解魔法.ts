import { GamePhase } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter } from "../../interface";
import { GetterChain } from "../../hook";

let name = "大質因數分解魔法";
let description = "獲得6魔力。你可以指定一至五個角色做為施放者，每個角色降低本咒語2點魔力成本";

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 9;
    can_play_phase = [GamePhase.InAction];

    max_caster = 5;
    min_caster = 1;

    get_mana_cost_chain = (() => {
        let chain = new GetterChain<number, null>();
        chain.append(cost => {
            let minus = this.data.casters.length * 2;
            return { var_arg: cost - minus };
        });
        return chain;
    })();

    async onPlay() {
        await super.onPlay();
        this.my_master.addMana(6);
    }
}