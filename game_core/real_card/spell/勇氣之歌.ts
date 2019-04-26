import { GamePhase, CharStat, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd } from "../../interface";
import { GetterChain } from "../../hook";
import { BadOperationError } from "../../errors";

let name = "勇氣之歌";
let description = "你只能在戰鬥中施放本咒語，令一個戰鬥中的角色從疲勞中恢復，並使其戰力增加2，直到戰鬥結束。";

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 2;
    can_play_phase = [GamePhase.InWar];

    max_caster = 0;
    min_caster = 0;

    readonly data: {
        casters: ICharacter[],
        target: ICharacter | null
    } = {
        casters: [],
        target: null
    }

    async initialize(): Promise<boolean> {
        this.data.target = await this.g_master.selecter.promptUI("指定施放者")
        .selectCard(this.owner, this, {
            guard: TypeGaurd.isCharacter,
            stat: CardStat.Onboard
        }, c => {
            return c.char_status == CharStat.InWar;
        });
        if(this.data.target) {
            return this.my_master.checkCanPlay(this);
        } else {
            return false;
        }
    }

    setupAliveEffect() {
        if(!this.data.target) {
            throw new BadOperationError("未指定對象就施放咒語", this);
        }
        this.addGetterWhileAlive(true, this.data.target.get_strength_chain, str => {
            return { var_arg: str + 2 };
        });
        this.addActionWhileAlive(true, this.g_master.w_master.end_war_chain, () => {
            this.my_master.retireCard(this);
        });
    }

    async onPlay() {
        if(this.data.target) {
            await this.my_master.changeCharTired(this.data.target, false);
        }
    }
}