import { GamePhase, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd } from "../../interface";
import { GetterChain } from "../../hook";

let name = "質因數分解魔法";
let description = "獲得6魔力。你可以指定一至四個角色做為施術者，每個角色降低本咒語2點魔力成本";

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 8;
    can_play_phase = [GamePhase.InAction];

    max_caster = 4;
    min_caster = 1;

    check_before_play_chain = (() => {
        let chain = new GetterChain<boolean, null>();
        chain.append((b, n) => {
            let casters_may_be = this.getMaybeCasters();
            if(this.my_master.mana >= this.basic_mana_cost - casters_may_be.length * 2) {
                // 極限狀況下是放得出來的
                return { var_arg: true };
            }
        });
        return chain;
    })();

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