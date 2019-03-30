import { ICard, IUpgrade, TypeGaurd as TG, ICharacter, IArena, IEvent } from "./interface";
import { EventChain } from "./hook";
import { CardStat, CharStat, BattleRole, Player } from "./enums";
import { throwIfIsBackend, BadOperationError } from "./errors";

export const Constant = {
    ENTER_ENEMY_COST: 1,
    MAX_ARENA: 5,
    ARENA_CAPACITY: 2,
    PUSH_COST: 1
};

/**
 * 這裡的每條規則都會被接到世界的事件鏈上，因此可以被斷鏈，也可以被同條鏈上後面的規則覆蓋。
 * 需注意的是，如果你要覆蓋的只是一部份規則，使用覆蓋機制時應該注意把需要的規則手動補回來。
 */
export class SoftRule {
    public static checkPlay(card_play_chain: EventChain<null, ICard>) {
        card_play_chain.appendCheck((can_play, card) => {
            if(TG.isUpgrade(card)) {
                return { var_arg: SoftRule.checkPlayUpgrade(card) };
            }
        });
    }
    /** 計算戰鬥職位的通則 */
    public static onGetBattleRole(get_battle_role_chain: EventChain<BattleRole, ICharacter>,
        getStrength: (c: ICharacter) => number
    ) {
        get_battle_role_chain.append((role, char) => {
            if(getStrength(char) == 0) {
                return { var_arg: { ...role, can_attack: false, can_block: false } };
            }
        });
    }
    /** 進入對手的場所要支付代價 */
    public static onGetEnterCost(get_enter_cost_chain: EventChain<number, { char: ICharacter, arena: IArena }>) {
        get_enter_cost_chain.append((cost, arg) => {
            if(arg.char.owner != arg.arena.owner) {
                return { var_arg: cost + Constant.ENTER_ENEMY_COST };
            }
        });
    }
    public static checkEnter(enter_chain: EventChain<null, { char: ICharacter, arena: IArena }>) {
        enter_chain.appendCheck((can_enter, { arena, char }) => {
            if(char.char_status != CharStat.StandBy) {
                // 理論上，在場所中的角色不能移動
                return { var_arg: false };
            } else if(char.is_tired) {
                // 理論上，疲勞中的角色不能移動
                return { var_arg: false };
            } else if(arena.char_list.length + 1 > arena.max_capacity) {
                // 理論上，場所中的角色不可超過上限
                return { var_arg: false };
            }
        });
    }
    /** 進入對手的場所，對手可以拿錢 */
    public static onEnter(enter_chain: EventChain<null, { char: ICharacter, arena: IArena }>,
        addMana: (player: Player, mana: number) => void
    ) {
        enter_chain.append((t, arg) => {
            if(arg.char.owner != arg.arena.owner) {
                addMana(arg.arena.owner, Constant.ENTER_ENEMY_COST);
            }
        });
    }
    public static checkExploit(exploit_chain: EventChain<null, { arena: IArena, char: ICharacter | Player }>) {
        exploit_chain.appendCheck((t, { arena, char }) => {
            if(TG.isCard(char)) {
                if(!arena.isEqual(char.arena_entered)) {
                    // 角色不可開發自身所在地之外的場所
                    return { var_arg: false };
                }
            }
        });
    }
    public static checkPush(push_chain: EventChain<null, { char: ICharacter | null, event: IEvent }>) {
        push_chain.appendCheck((t, { char, event }) => {
            if(event.cur_time_count <= 0) {
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
    public static onFail(fail_chain: EventChain<null, IEvent>, getMana: () => number,
        addMana: (mana: number) => void, addEmo: (emo: number) => void
    ) {
        fail_chain.append((t, evt) => {
            let mana_cost = Math.min(getMana(), evt.basic_mana_cost);
            let emo_cost = evt.basic_mana_cost - mana_cost;
            addMana(-mana_cost);
            addEmo(-emo_cost);
        });
    }
    // 理論上，當任務成功，完成的角色應該退場
    public static onFinish(finish_chain: EventChain<null, { char: ICharacter | null, event: IEvent }>,
        retireCard: (c: ICard) => void
    ) {
        finish_chain.append((t, { char, event }) => {
            if(TG.isCard(char)) {
                retireCard(char);
            }
        });
    }

    public static onGetManaCost(
        get_mana_cost_chain: EventChain<number, ICard>, arenas: IArena[]
    ) {
        get_mana_cost_chain.append((cost, card) => {
            // 改建的費用可以下降
            if(TG.isArena(card)) {
                let new_cost = Math.max(0, cost - arenas[card.position].basic_mana_cost);
                return { var_arg: new_cost };
            }
        });
    }

    private static checkPlayUpgrade(u: IUpgrade): boolean {
        // 打出升級卡的限制
        if(u.character_equipped && u.character_equipped.char_status != CharStat.StandBy) {
            // 指定的角色不在待命區
            return false;
        } else {
            return true;
        }
    }

}

/**
 * 這裡的每條規則都無法被覆蓋（除非整個效果被攔截），大部份是為了防止奇奇怪怪的錯誤。
 */
export class HardRule {
    public static checkPlay(player: Player, card: ICard, mana: number, cost: number): boolean {
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
        }

        return true;
    }
    public static onPlay(card: ICard,
        addCharacter: (ch: ICharacter) => void,
        addEvent: (evt: IEvent) => void,
    ) {
        if(TG.isUpgrade(card)) {
            // 把這件升級加入角色的裝備欄
            if(card.character_equipped) {
                card.character_equipped.addUpgrade(card);
            }
        } else if(TG.isCharacter(card)) {
            // 打出角色後把她加入角色區
            addCharacter(card);
        } else if(TG.isArena(card)) {
            // 打出場所的規則（把之前的建築拆了）
            // TODO:
        } else if(TG.isEvent(card)) {
            // 把事件加入待完成區
            addEvent(card);
        }
    }
    public static onLeave(card: ICard, retireCard: (c: ICard) => void) {
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
            throw new BadOperationError("欲進入的場所不在場上");
        } else if(cost > mana) {
            throwIfIsBackend("魔不夠就想進入場所");
            return false;
        }
        return true;
    }
    public static onEnter(char: ICharacter, arena: IArena) {
        // 角色陷入疲勞
        char.is_tired = true;
        // 讓角色跟場所記得對方
        char.char_status = CharStat.InArena;
        char.arena_entered = arena;
        arena.enter(char);
        // 跟據角色有沒有突擊特性，決定她會不會陷入旅行疲勞
        char.way_worn = char.assault;
    }
    /** 這裡的 char 可以是一個玩家 */
    public static checkExploit(arena: IArena, char: ICharacter | Player, mana: number, cost: number): boolean {
        if(TG.isCard(char)) {
            if(char.card_status != CardStat.Onboard) {
                throw new BadOperationError("欲開發場所的角色不在場上");
            }
        } else if(arena.card_status != CardStat.Onboard) {
            throw new BadOperationError("欲開發的場所不在場上");
        } else if(cost > mana) {
            throwIfIsBackend("魔不夠就想開發資源？");
            return false;
        }
        return true;
    }
    public static checkPush(event: IEvent, char: ICharacter | null, mana: number, cost: number): boolean {
        if(event.card_status != CardStat.Onboard) {
            throw new BadOperationError("嘗試推進不在場上事件！");
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
                throw new BadOperationError("指定的角色不在場上", u);
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
            throw new BadOperationError("場所的位置超過範圍");
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
    private static onLeaveCharacter(c: ICharacter, retireCard: (c: ICard) => void) {
        // 銷毀所有裝備
        for(let u of c.upgrade_list) {
            retireCard(u);
        }
        // TODO: 通知場所更新角色列表

    }
}