import { Event } from "../../cards";
import { IEvent, ICharacter, TypeGaurd as TG, TypeGaurd, buildConfig, IArena } from "../../interface";
import { CardSeries, Player, CardStat, RuleEnums } from "../../enums";
import { BadOperationError } from "../../errors";

let name = "獨當一面的證明";
let description = `選擇對手的一個位置成為「試煉場」，每次你使用該位置的場所，本事件推進增加1。本事件不可被角色推進。
結算：從牌庫檢索2張卡牌。`;

export default class E extends Event implements IEvent {
    name = name;
    description = description;

    readonly is_ending = false;
    readonly score = 2;
    readonly goal_progress_count = 3;
    readonly init_time_count = 2;
    readonly push_cost = 0;

    basic_mana_cost = 3;

    data = {
        trial_pos: -1
    };

    checkCanPush(char: ICharacter | null) {
        if(char) {
            return false;
        } else {
            return true;
        }
    }

    onPush(char: ICharacter | null) { }

    async onFinish() {
        let card = await this.g_master.selecter.cancelUI()
        .selectCardInteractive(this.owner, this, buildConfig({
            guard: TypeGaurd.isKnown,
            stat: CardStat.Deck,
            owner: this.owner,                
        }));
        if(card) {
            let card_to_draw = await this.g_master.exposeCard(card);
            await this.my_master.draw(card_to_draw);
        }
    }

    setupFinishEffect() { }

    async initialize(): Promise<boolean> {
        let arena = await this.g_master.selecter.promptUI("選擇試煉場")
        .selectCard(this.owner, [this], buildConfig({
            guard: TG.isArena,
            owner: this.enemy_master.player,
            count: 2
        }));
        if(arena) {
            this.data.trial_pos = arena.data.position;
            return true;
        } else {
            return false;
        }
    }

    setupAliveEffect() {
        this.my_master.exploit_chain.append(async ({ arena }) => {
            if(arena.data.position == this.data.trial_pos) {
                await this.my_master.addEventProgress(this, null, 1,
                    [RuleEnums.CheckPhaseWhenPush]);
            }
        });
    }
}