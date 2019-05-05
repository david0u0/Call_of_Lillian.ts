import { CardSeries, Player, ActionEnums, RuleEnums } from "../../enums";
import { Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard, buildConfig } from "../../interface";
import { BadOperationError } from "../../errors";

let name = "無法地帶";
let description = `本場所可視為所有類型。
使用：選擇場上另一個場所，本次行動視為使用該場所（需通過所有檢查並支付代價）。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 5;
    basic_exploit_cost = 0;
    series = [ CardSeries.Any ];

    data: {
        position: number,
        choice_table: {
            [nonce: number]: IArena
        }
    } = {
        position: -1,
        choice_table: {}
    };

    setupAliveEffect() {
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            pm.setup_before_action_chain.append(async ({ args, action }, nonce) => {
                if(action == ActionEnums.Exploit && this.isEqual(args[0])) {
                    let arena = await this.g_master.selecter.selectCard(p, [this], buildConfig({
                        guard: TypeGaurd.isArena,
                        check: card => {
                            // TODO: 應該寫一個 checkCanExploit 方法
                            return !(TypeGaurd.isSameCard(this, card));
                        }
                    }));
                    if(arena) {
                        this.data.choice_table[nonce] = arena;
                    } else {
                        return { intercept_effect: true };
                    }
                }
            });
            pm.exploit_chain.dominant((arg, nonce) => {
                if(this.data.choice_table[nonce]) {
                    // 既然已經可以使用「無法地帶」了，就別管這類泛用性的檢查了吧
                    // 例如：在主階段中因為卡牌的效果使用了無法地帶，接著再選擇另一個場所來使用，
                    // 這時如果因為遊戲階段不對被擋下來，不是很瞎嗎？
                    return { mask_id: RuleEnums.CheckPhaseBeforeExploit };
                }
            });
        }
    }

    async onExploit(char: ICharacter | Player, nonce: number) {
        let [p, caller] = this.getPlayerAndCaller(char);
        let arena = this.data.choice_table[nonce];
        if(arena) {
            await this.g_master.getMyMaster(p).exploit(arena, char);
        } else {
            throw new BadOperationError("不知為何沒有選擇另一個場所", this);
        }
    }
}