import { Character } from "../../cards";
import { CardType, CardStat, CharStat, RuleEnums, GamePhase, CardSeries, ActionEnums } from "../../enums";
import { TypeGaurd, IEvent, Ability, buildConfig, ICharacter, IArena, Data } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "時光小偷";
let description = "**現在放棄還太早了吧！**：（角色行動）選擇一個事件，令其倒數增加1。";

export default class C4 extends Character implements ICharacter {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_strength = 1;
    series = [CardSeries.Time];

    data = {
        str_counter: 0,
        arena_entered: null as IArena|null,
        event_chosen: { } as { [nonce: number]: IEvent }
    };

    _abilities: Ability[] = [{
        description: "現在放棄還太早了吧！：選擇一個事件，令其倒數增加1。",
        func: async (nonce) => {
            if(this.data.event_chosen[nonce]) {
                let event = this.data.event_chosen[nonce];
                await this.my_master.addEventCountdown(event, 1);
            } else {
                throw new BadOperationError("沒有選擇事件");
            }
            await this.my_master.changeCharTired(this, true);
        },
        canTrigger: (nonce) => {
            return !this.is_tired && this.char_status == CharStat.StandBy
                && (nonce in this.data.event_chosen);
        },
        can_play_phase: [GamePhase.InAction],
    }];

    setupAliveEffect() {
        this.my_master.setup_before_action_chain.append(async ({args, action}, nonce) => {
            if(action == ActionEnums.Ability && this.isEqual(args[0])) {
                let event = await this.g_master.selecter
                .selectCard(this.owner, [this], buildConfig({
                    guard: TypeGaurd.isEvent,
                    is_finished: false,
                }));
                if(event) {
                    this.data.event_chosen[nonce] = event;
                }
            }
        });
    }
}