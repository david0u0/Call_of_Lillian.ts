import { GamePhase, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd, IArena, buildConfig } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "慶典之夜";
let description = `本咒語不需要施術者。
選擇一個場所並宣戰，期間你每擊退一個角色，恢復一點情緒，並造成對手一點情緒傷害。`;

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
            await this.my_master.retireCard(this);
        });
        this.addActionWhileAlive(this.g_master.w_master.repulse_chain, async ({ loser, winner }) => {
            if(loser.owner != this.owner && winner.length > 0) {
                await this.my_master.addEmo(-1);
                await this.enemy_master.addEmo(1);
            }
        });
    }
}