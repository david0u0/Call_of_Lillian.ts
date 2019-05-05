import { GamePhase, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd, IArena, buildConfig } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "殲滅戰";
let description = `本咒語不需要施術者。
選擇一個場所並宣戰。若你贏得戰鬥（擊退較多角色），則對手的魔力歸零。`;

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 3;
    can_play_phase = [GamePhase.InAction];

    readonly data: {
        casters: ICharacter[],
        war_field: IArena | null;
    } = {
        casters: [],
        war_field: null
    }

    async initialize() {
        this.data.war_field = await this.g_master.selecter.selectCard(this.owner, this, buildConfig({
            guard: TypeGaurd.isArena,
            check: arena => {
                return this.g_master.w_master.checkCanDeclare(this.owner, arena);
            }
        }));

        if(this.data.war_field) {
            return true;
        } else {
            return false;
        }
    }

    async onPlay() {
        if(this.data.war_field) {
            await this.g_master.w_master.declareWar(this.owner, this.data.war_field, false);
        } else {
            throw new BadOperationError("未指定宣戰場所");
        }
    }
    setupAliveEffect() {
        this.addGetterWhileAlive(this.g_master.w_master.get_declare_cost_chain, () => {
            return { var_arg: 0, break_chain: true };
        });
        this.addActionWhileAlive(this.g_master.w_master.end_war_chain, async () => {
            if(this.g_master.w_master.isWinner(this.owner)) {
                await this.enemy_master.addMana(-this.enemy_master.mana);
            }
            await this.my_master.retireCard(this);
        });
    }
}