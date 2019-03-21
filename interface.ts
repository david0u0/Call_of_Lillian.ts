import { EventChain, HookResult } from "./hook";
import { Player, CardType, CardSeries, BattleRole, CharStat, CardStat } from "./enums";

interface IKeeper { };
interface ICard {
    readonly seq: number;
    readonly owner: Player;
    readonly card_type: CardType;
    readonly name: string;
    readonly description: string;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];

    /**  */
    card_status: CardStat;

    readonly get_mana_cost_chain: EventChain<number>;
    readonly card_play_chain: EventChain<null>;
    /** 只要從場上離開，不論退場還是消滅都會觸發這條 */
    readonly card_leave_chain: EventChain<null>;
    /** 只有退場會觸發這條效果 */
    readonly card_retire_chain: EventChain<null>;

    isEqual(card: ICard): boolean;
    /** 在抽起來的同時觸發本效果 */
    initialize(): void;

    /** 在打卡前進行相關的設置，通常是UI */
    setupBeforePlay(): void;

    /**
     * 創造一個新的規則，接上某條規則鏈的尾巴。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     * @param check 若此項為真，則代表接上的是驗證規則
     */
    appendChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void, check?: boolean): void ;
    /**
     * 創造一個新的規則，接上某條規則鏈的開頭。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     * @param check 若此項為真，則代表接上的是驗證規則
     */
    dominantChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void, check?: boolean): void;
}
interface ICharacter extends ICard { };
interface IUpgrade extends ICard { };
interface ICharacter extends ICard { };
interface IArena extends ICard { };
interface IEvent extends ICard { };
interface ISpell extends ICard { };

interface IUpgrade extends ICard {
    readonly basic_strength: number;
    character_equipped: ICharacter|null;
}
interface ICharacter extends ICard {
    readonly basic_strength: number;
    readonly basic_battle_role: BattleRole;
    upgrade_list: IUpgrade[];
    arena_entered: IArena|null;
    char_status: CharStat;
    is_tired: boolean;

    readonly get_strength_chain: EventChain<number>;
    readonly enter_arena_chain: EventChain<IArena>;
    readonly attack_chain: EventChain<ICharacter>;
    readonly get_battle_role_chain: EventChain<BattleRole>;
}

interface IArena extends ICard {
}
interface IEvent extends ICard {
    readonly goal_progress_count: number;
    readonly cur_progress_count: number;
    readonly init_time_count: number;
    readonly cur_time_count: number;
    readonly is_ending: boolean;
}
interface ISpell extends ICard {

}
export {
    IKeeper, ICard, ICharacter, IUpgrade, IArena, ISpell
}