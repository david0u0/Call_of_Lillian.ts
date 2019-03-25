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

    card_status: CardStat;

    readonly get_mana_cost_chain: EventChain<number>;
    readonly card_play_chain: EventChain<null>;
    /** 只要從場上離開，不論退場還是消滅都會觸發這條 */
    readonly card_leave_chain: EventChain<null>;
    /** 只有退場會觸發這條效果 */
    readonly card_retire_chain: EventChain<null>;

    isEqual(card: ICard|null): boolean;
    /** 在打牌之前執行，將該設置的變數設起來 */
    initialize(): void;
    /** 入場曲或咒語效果的概念 */
    onPlay(): void;
    /** 退場曲的概念 */
    onRetrieve(): void;

    /** 記憶與恢復變數，理論上只有前端會用到（因為後端檢查沒過會直接爆錯） */
    rememberFields(): void;
    recoverFields(): void;

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
    readonly character_equipped: ICharacter|null;
}
interface ICharacter extends ICard {
    readonly basic_strength: number;
    readonly basic_battle_role: BattleRole;
    readonly upgrade_list: IUpgrade[];
    arena_entered: IArena|null;
    char_status: CharStat;
    is_tired: boolean;

    readonly has_char_action: boolean;
    charAction(): void;

    readonly get_strength_chain: EventChain<number>;
    readonly enter_arena_chain: EventChain<IArena>;
    readonly attack_chain: EventChain<ICharacter>;
    readonly get_battle_role_chain: EventChain<BattleRole>;
    readonly get_infight_strength_chain
        : EventChain<{ strength: number, enemy: ICharacter }>;

    readonly exploit_chain: EventChain<IArena>;
    readonly enter_chain: EventChain<IArena>;
    readonly get_exploit_cost_chain: EventChain<{ cost: number, arena: IArena }>;
    readonly get_enter_cost_chain: EventChain<{ cost: number, arena: IArena }>;

    /** 不可覆寫！ */
    addUpgrade(upgrade: IUpgrade): void;
    distroyUpgrade(u: IUpgrade): void;
}

interface IArena extends ICard {
    readonly positioin: number;
    readonly char_list: ICharacter[];
    readonly basic_exploit_cost: number;
    readonly max_capacity: number;

    readonly exploit_chain: EventChain<ICharacter>;
    readonly enter_chain: EventChain<ICharacter>;
    readonly get_exploit_cost_chain: EventChain<{ cost: number, char: ICharacter }>;
    readonly get_enter_cost_chain: EventChain<{ cost: number, char: ICharacter }>;

    /** 回傳值如果是數字，代表的是魔力收入 */
    onExploit(char: ICharacter): void|number;
    /** 不可覆寫！ */
    enter(char: ICharacter): void;
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
    IKeeper, ICard, ICharacter, IUpgrade, IArena, IEvent, ISpell
}