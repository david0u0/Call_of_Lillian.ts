import { HookChain, HookResult } from "./hook";
import { Player, CardType, CardSeries, BattleRole, CharStat } from "./enums";

interface IKeeper { };
interface ICard {
    readonly seq: number;
    readonly owner: Player;
    readonly card_type: CardType;
    readonly name: string;
    readonly description: string;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];

    readonly get_mana_cost_chain: HookChain<number>;
    readonly card_play_chain: HookChain<null>;
    /** 只要從場上離開，不論退場還是消滅都會觸發這條 */
    readonly card_leave_chain: HookChain<null>;
    /** 只有退場會觸發這條效果 */
    readonly card_die_chain: HookChain<null>;

    /** 在抽起來的同時觸發本效果 */
    initialize(): void;

    /**
     * 創造一個新的規則，接上某條規則鏈的尾巴。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    appendChainWhileAlive<T>(chain: HookChain<T>[]|HookChain<T>,
        func: (arg: T) => HookResult<T>|void): void ;
    /**
     * 創造一個新的規則，接上某條規則鏈的開頭。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    dominantChainWhileAlive<T>(chain: HookChain<T>[]|HookChain<T>,
        func: (arg: T) => HookResult<T>|void): void;
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
    status: CharStat;

    readonly get_strength_chain: HookChain<number>;
    readonly enter_arena_chain: HookChain<IArena>;
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