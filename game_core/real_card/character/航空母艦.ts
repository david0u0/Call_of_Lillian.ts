import { Character } from "../../cards";
import { TypeGaurd, IKnownCard } from "../../interface";
import { CharStat } from "../../enums";

let name = "航空母艦";
let description = `守護（不可攻擊），超凡2
不沉的堡壘：與本角色處於同個場所的我方其它角色，額外得到2戰力，並且不會在衝突中被擊退。`;

export default class C extends Character {
    name = name;
    description = description;
    basic_mana_cost = 4;
    basic_strength = 1;
    basic_battle_role = { can_attack: false, can_block: true };
    
    setupAliveEffect() {
        let checkEffect = (card: IKnownCard) => {
            if(TypeGaurd.isCharacter(card) && this.data.arena_entered && card.owner == this.owner) {
                if(this.data.arena_entered.isEqual(card.data.arena_entered) && !this.isEqual(card)) {
                    return true;
                }
            }
            return false;
        };
        this.my_master.get_strength_chain.append((str, { card }) => {
            if(checkEffect(card)) {
                return { var_arg: str + 2 };
            }
        });
        this.g_master.w_master.repulse_chain.dominant(({ loser, winner }) => {
            if(winner.length > 0 && checkEffect(loser)) {
                return { intercept_effect: true };
            }
        });
    }
}