import { CardSeries, Player, ActionEnums } from "../../enums";
import { Arena } from "../../cards";
import { IArena, ICharacter, TypeGaurd, IKnownCard } from "../../interface";

let name = "校園偶像事務所";
let description = `使用：2魔力→召募一名*見習魔女*至待命區。
或
使用：賺取3魔力，並承受1情緒。`;

export default class A extends Arena implements IArena {
    name = name;
    description = description;
    basic_mana_cost = 3;
    basic_exploit_cost = 0;

    data: {
        position: number,
        choice_table: {
            [nonce: number]: number
        }
    } = {
        position: -1,
        choice_table: {}
    };

    setupAliveEffect() {
        let options = ["2魔力→召募一名*見習魔女*至待命區。", "賺取3魔力，並承受1情緒。"];
        for(let p of [Player.Player1, Player.Player2]) {
            let pm = this.g_master.getMyMaster(p);
            pm.setup_before_action_chain.append(async ({ args, action }, nonce) => {
                if(action == ActionEnums.Exploit && this.isEqual(args[0])) {
                    let choice = await this.g_master.selecter.selectText(p, this, options);
                    if(typeof choice == "number") {
                        this.data.choice_table[nonce] = choice;
                    } else {
                        return { intercept_effect: true };
                    }
                }
            });
            pm.get_exploit_cost_chain.dominant((cost, { arena }, nonce) => {
                if(this.isEqual(arena) && this.data.choice_table[nonce] == 0) {
                    return { var_arg: 2 };
                }
            });
        }
    }

    async onExploit(char: ICharacter | Player, nonce: number) {
        let [p, caller] = this.getPlayerAndCaller(char);
        if(this.data.choice_table[nonce] == 0) {
            await this.g_master.genCardToBoard(p, "見習魔女");
        } else {
            await this.g_master.getMyMaster(char).addEmo(1, caller);
            return 3;
        }
    }
}