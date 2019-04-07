import { IKnownCard, IUpgrade, TypeGaurd as TG, ICharacter, IArena, IEvent } from "./interface";
import { ActionChain, GetterChain } from "./hook";
import { CardStat, CharStat, BattleRole, Player, GamePhase } from "./enums";
import { throwIfIsBackend, BadOperationError } from "./errors";

export const Constant = {
    REST_MANA: 1,
    ENTER_ENEMY_COST: 1,
    MAX_ARENA: 5,
    ARENA_CAPACITY: 2,
    PUSH_COST: 1,
    DECK_COUNT: 20,
    INIT_MANA: 10,
    INIT_HAND: 7,
    DUMMY_NAME: "dummy_arena",
};

/**
 * 這裡的每條規則都會被接到世界的事件鏈上，因此可以被斷鏈，也可以被同條鏈上後面的規則覆蓋。
 * 需注意的是，如果你要覆蓋的只是一部份規則，使用覆蓋機制時應該注意把需要的規則手動補回來。
 */
export class SoftRule {
    constructor(private getPhase: () => GamePhase) { }

    public checkPlay(card_play_chain: ActionChain<IKnownCard>, getCharQuota: () => number) {
        card_play_chain.appendCheck((can_play, card) => {
            let phase = this.getPhase();
            // 針對遊戲階段的檢查
            if(phase == GamePhase.Setup) {
                return { var_arg: true, break_chain: true };
            }
            if(TG.isArena(card)) {
                if(phase != GamePhase.Building) {
                    throwIfIsBackend("只能在建築階段打出場所卡", card);
                    return { var_arg: false };
                }
            } else if(card.instance) {
                if(phase != GamePhase.InAction && phase != GamePhase.BetweenActions) {
                    throwIfIsBackend("只能在主階段出牌", card);
                    return { var_arg: false };
                }
            } else if(phase != GamePhase.InAction) {
                throwIfIsBackend("只能在主階段的行動時出牌", card);
                return { var_arg: false };
            }
            // 對各類卡牌的檢查
            if(TG.isUpgrade(card)) {
                // 打出升級卡的限制
                if(card.character_equipped && card.character_equipped.char_status != CharStat.StandBy) {
                    // 指定的角色不在待命區
                    throwIfIsBackend("指定的角色不在待命區", card);
                    return { var_arg: false };
                }
            } else if(TG.isCharacter(card)) {
                if(getCharQuota() == 0) {
                    // 一回合打出的角色超過上限
                    throwIfIsBackend("一回合打出的角色超過上限", card);
                    return { var_arg: false };
                }
            }
        });
    }
    /** 計算戰鬥職位的通則 */
    public onGetBattleRole(get_battle_role_chain: GetterChain<BattleRole, ICharacter>,
        getStrength: (c: ICharacter) => number
    ) {
        get_battle_role_chain.append((role, char) => {
            if(getStrength(char) == 0) {
                return { var_arg: { ...role, can_attack: false, can_block: false } };
            }
        });
    }
    /** 進入對手的場所要支付代價 */
    public onGetEnterCost(get_enter_cost_chain: GetterChain<number, { char: ICharacter, arena: IArena }>) {
        get_enter_cost_chain.append((cost, arg) => {
            if(arg.char.owner != arg.arena.owner) {
                return { var_arg: cost + Constant.ENTER_ENEMY_COST };
            }
        });
    }
    public checkEnter(enter_chain: ActionChain<{ char: ICharacter, arena: IArena }>) {
        enter_chain.appendCheck((can_enter, { arena, char }) => {
            if(this.getPhase() != GamePhase.InAction) {
                throwIfIsBackend("只能在主階段的行動時移動");
                return { var_arg: false };
            }
            else if(char.char_status != CharStat.StandBy) {
                throwIfIsBackend("在場所中的角色不能移動");
                return { var_arg: false };
            } else if(char.is_tired) {
                throwIfIsBackend("疲勞中的角色不能移動");
                return { var_arg: false };
            } else if(arena.find(null) == -1) {
                throwIfIsBackend("場所中的角色不可超過上限");
                return { var_arg: false };
            }
        });
    }
    /** 進入對手的場所，對手可以拿錢 */
    public onEnter(enter_chain: ActionChain<{ char: ICharacter, arena: IArena }>,
        addMana: (player: Player, mana: number) => void
    ) {
        enter_chain.append(({ char, arena }) => {
            if(char.owner != arena.owner) {
                addMana(arena.owner, Constant.ENTER_ENEMY_COST);
            }
        });
    }
    public checkExploit(exploit_chain: ActionChain<{ arena: IArena, char: ICharacter | Player }>) {
        exploit_chain.appendCheck((t, { arena, char }) => {
            if(this.getPhase() != GamePhase.Exploit) {
                throwIfIsBackend("只能在收獲階段使用場所");
                return { var_arg: false };
            } else if(TG.isCard(char)) {
                if(!arena.isEqual(char.arena_entered)) {
                    // 角色不可開發自身所在地之外的場所
                    return { var_arg: false };
                }
            }
        });
    }
    public checkPush(push_chain: ActionChain<{ char: ICharacter | null, event: IEvent }>) {
        push_chain.appendCheck((t, { char, event }) => {
            if(this.getPhase() != GamePhase.InAction) {
                throwIfIsBackend("只能在主階段行動時推進事件");
                return { var_arg: false };
            } else if(event.cur_time_count <= 0) {
                // 不可推進倒數為0的事件
                return { var_arg: false };
            } else if(event.cur_progress_count >= event.goal_progress_count) {
                // 不可推進已到達目標的事件
                return { var_arg: false };
            } else if(TG.isCard(char) && char.is_tired) {
                // 不可用疲勞的角色來推進
                return { var_arg: false };
            }
        });
    }
    // 理論上，當任務失敗，應該扣掉等同基礎開銷的魔力，多出來的話一比一變成情緒傷害。
    public onFail(fail_chain: ActionChain<IEvent>, getMana: () => number,
        addMana: (mana: number) => void, addEmo: (emo: number) => void
    ) {
        fail_chain.append(evt => {
            let mana_cost = Math.min(getMana(), evt.basic_mana_cost);
            let emo_cost = evt.basic_mana_cost - mana_cost;
            addMana(-mana_cost);
            addEmo(emo_cost);
        });
    }
    // 理論上，當任務成功，完成的角色應該退場
    public onFinish(finish_chain: ActionChain<{ char: ICharacter | null, event: IEvent }>,
        retireCard: (c: IKnownCard) => void
    ) {
        finish_chain.append(({ char, event }) => {
            if(TG.isCard(char)) {
                retireCard(char);
            }
        });
    }

    public onGetManaCost(
        get_mana_cost_chain: GetterChain<number, IKnownCard>, getArenas: () => IArena[]
    ) {
        get_mana_cost_chain.append((cost, card) => {
            // 改建的費用可以下降
            if(TG.isArena(card)) {
                let new_cost = Math.max(0, cost - getArenas()[card.position].basic_mana_cost);
                return { var_arg: new_cost };
            }
        });
    }
}

/**
 * 這裡的每條規則都無法被覆蓋（除非整個效果被攔截），大部份是為了防止奇奇怪怪的錯誤。
 */
export class HardRule {
    public static checkPlay(player: Player, card: IKnownCard, mana: number, cost: number): boolean {
        if(card.owner != player) {
            throw new BadOperationError("你想出對手的牌！！？", card);
        } else if(card.card_status != CardStat.Hand) {
            throw new BadOperationError("牌不在手上還想出牌？", card);
        } else if(mana < cost) {
            throwIfIsBackend("魔力不夠還想出牌？", card);
            return false;
        } else if(TG.isUpgrade(card)) {
            return HardRule.checkPlayUpgrade(card);
        } else if(TG.isArena(card)) {
            return HardRule.checkPlayArena(card);
        } else if(!TG.isKnown(card)) {
            // 理論上不太可能走到這啦
            throw new BadOperationError("未知的牌也想拿來打？");
        }

        return true;
    }
    public static onLeave(card: IKnownCard, retireCard: (c: IKnownCard) => void) {
        if(TG.isUpgrade(card)) {
            HardRule.onLeaveUpgrade(card);
        } else if(TG.isCharacter(card)) {
            HardRule.onLeaveCharacter(card, retireCard);
        }
    }
    public static checkEnter(char: ICharacter, arena: IArena, mana: number, cost: number): boolean {
        if(char.card_status != CardStat.Onboard) {
            throw new BadOperationError("欲進入場所的角色不在場上");
        } else if(arena.card_status != CardStat.Onboard) {
            throwIfIsBackend("欲進入的場所不在場上");
            return false;
        } else if(cost > mana) {
            throwIfIsBackend("魔不夠就想進入場所");
            return false;
        }
        return true;
    }
    public static onEnter(char: ICharacter, arena: IArena) {
        // 讓角色跟場所記得對方
        char.char_status = CharStat.InArena;
        char.arena_entered = arena;
        arena.enter(char);
        // 跟據角色有沒有突擊特性，決定她會不會陷入旅行疲勞
        char.way_worn = char.assault;
    }
    /** 這裡的 char 可以是一個玩家 */
    public static checkExploit(arena: IArena, char: ICharacter | Player, mana: number, cost: number): boolean {
        if(arena.card_status != CardStat.Onboard) {
            throw new BadOperationError("欲開發的場所不在場上");
        } else if(cost > mana) {
            throwIfIsBackend("魔不夠就想開發資源？");
            return false;
        } else if(TG.isCard(char)) {
            if(char.card_status != CardStat.Onboard) {
                throw new BadOperationError("欲開發場所的角色不在場上");
            }
        }
        return true;
    }
    public static checkPush(event: IEvent, char: ICharacter | null, mana: number, cost: number): boolean {
        if(event.card_status != CardStat.Onboard) {
            throwIfIsBackend("嘗試推進不在場上的事件！");
            return false;
        } else if(TG.isCard(char)) {
            if(char.card_status != CardStat.Onboard) {
                throw new BadOperationError("嘗試用不在場上的角色推進事件！");
            } else if(char.owner != event.owner) {
                throwIfIsBackend("你想推進別人的事件？");
                return false;
            }
        } else if(char != event.owner) {
            throwIfIsBackend("你想推進別人的事件？");
            return false;
        }
        return true;
    }
    public static onPushEvent(event: IEvent) {
        event.push();
    }
    private static checkPlayUpgrade(u: IUpgrade): boolean {
        if(u.character_equipped) {
            if(u.character_equipped.card_status != CardStat.Onboard) {
                throwIfIsBackend("指定的角色不在場上", u);
                return false;
            } else if(u.character_equipped.owner != u.owner) {
                throwIfIsBackend("指定的角色不屬於你", u);
                return false;
            } else {
                return true;
            }
        } else {
            throwIfIsBackend("未指定角色就打出升級", u);
            return false;
        }
    }
    private static checkPlayArena(a: IArena): boolean {
        if(a.position >= Constant.MAX_ARENA || a.position < 0) {
            throwIfIsBackend("場所的位置超過範圍");
            return false;
        } else {
            return true;
        }
    }
    private static onLeaveUpgrade(u: IUpgrade) {
        if(u.character_equipped) {
            // 升級卡離場時，通知角色修改裝備欄
            u.character_equipped.distroyUpgrade(u);
        }
    }
    private static onLeaveCharacter(c: ICharacter, retireCard: (c: IKnownCard) => void) {
        // 銷毀所有裝備
        for(let u of c.upgrade_list) {
            retireCard(u);
        }
        // TODO: 通知場所更新角色列表

    }
}