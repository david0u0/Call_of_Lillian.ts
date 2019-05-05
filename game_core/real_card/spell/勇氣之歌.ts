import { GamePhase, CharStat, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd, buildConfig } from "../../interface";
import { GetterChain } from "../../hook";
import { BadOperationError } from "../../errors";

let name = "勇氣之歌";
let description = `本咒語不需要施術者。
令一個戰鬥中的角色從疲勞中恢復，並使其戰力增加2，直到戰鬥結束。`;

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 2;
    can_play_phase = [GamePhase.InWar];

    readonly data: {
        casters: ICharacter[],
        target: ICharacter | null
    } = {
        casters: [],
        target: null
    }

    async initialize(): Promise<boolean> {
        this.data.target = await this.g_master.selecter.promptUI("指定施放者")
        .selectCard(this.owner, this, buildConfig({
            guard: TypeGaurd.isCharacter,
            char_stat: CharStat.InWar
        }));
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
        this.addGetterWhileAlive(this.data.target.get_strength_chain, str => {
            return { var_arg: str + 2 };
        });
        this.addActionWhileAlive(this.g_master.w_master.end_war_chain, () => {
            this.my_master.retireCard(this);
        });
    }

    async onPlay() {
        if(this.data.target) {
            await this.my_master.changeCharTired(this.data.target, false);
        }
    }
}