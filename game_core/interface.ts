import { EventChain, HookResult, HookFunc } from "./hook";
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

    readonly get_mana_cost_chain: EventChain<number, null>;
    readonly card_play_chain: EventChain<null, null>;
    /** 只要從場上離開，不論退場還是消滅都會觸發這條 */
    readonly card_leave_chain: EventChain<null, null>;
    /** 只有退場會觸發這條效果 */
    readonly card_retire_chain: EventChain<null, null>;

    isEqual(card: ICard|null): boolean;

    /**
     * 在打牌之前執行，內部會呼叫選擇器，將該設置的變數設起來。
     * 之所以把這函式放在卡牌中而不是由 GameMaster 來決定，是因為有時候需要客製化每張牌的打牌流程。
     * 例如：施放咒語前指定任意角色，使他們疲勞，每指定一個角色降一費。
     * @returns 如果被取消就會回傳 false
     */
    initialize(): boolean;
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
     */
    appendChainWhileAlive<T, U>(chain: EventChain<T, U>[]|EventChain<T, U>,
        func: HookFunc<T, U>): void ;
    /**
     * 創造一個新的規則，接上某條規則鏈的開頭。當 this 這張卡牌死亡時，該規則也會失效。
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    dominantChainWhileAlive<T, U>(chain: EventChain<T, U>[]|EventChain<T, U>,
        func: HookFunc<T, U>): void;

    appendCheckWhileAlive<T, U>(chain: EventChain<T, U>[]|EventChain<T, U>,
        func: (arg: U) => void|HookResult<null>): void
    dominantCheckWhileAlive<T, U>(chain: EventChain<T, U>[]|EventChain<T, U>,
        func: (arg: U) => void|HookResult<null>): void
}
interface ICharacter extends ICard { };
interface IUpgrade extends ICard { };
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
    
    /** 剛進行移動的角色會陷入旅行疲勞，下個回合才可攻擊。 */
    way_worn: boolean;

    readonly has_char_action: boolean;
    charAction(): void;

    readonly get_strength_chain: EventChain<number, null>;
    readonly enter_arena_chain: EventChain<null, IArena>;
    readonly attack_chain: EventChain<null, ICharacter>;
    readonly get_battle_role_chain: EventChain<BattleRole, null>;
    readonly get_inconflict_strength_chain
        : EventChain<number, ICharacter>;

    readonly exploit_chain: EventChain<null, IArena>;
    readonly enter_chain: EventChain<null, IArena>;
    readonly get_exploit_cost_chain: EventChain<number, IArena>;
    readonly get_enter_cost_chain: EventChain<number, IArena>;

    /** 不可覆寫！ */
    addUpgrade(upgrade: IUpgrade): void;
    distroyUpgrade(u: IUpgrade): void;
}

interface IArena extends ICard {
    readonly position: number;
    readonly char_list: ICharacter[];
    readonly basic_exploit_cost: number;
    readonly max_capacity: number;

    readonly exploit_chain: EventChain<null, ICharacter>;
    readonly enter_chain: EventChain<null, ICharacter>;
    readonly get_exploit_cost_chain: EventChain<number, ICharacter>;
    readonly get_enter_cost_chain: EventChain<number, ICharacter>;

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

const TypeGaurd = {
    isUpgrade: function(c: ICard): c is IUpgrade {
        return c.card_type == CardType.Upgrade;
    },
    isCharacter: function(c: ICard): c is ICharacter {
        return c.card_type == CardType.Character;
    },
    isArena: function(c: ICard): c is IArena {
        return c.card_type == CardType.Arena;
    },
    isSpell: function(c: ICard): c is ISpell {
        return c.card_type == CardType.Spell;
    },
    isEvent: function(c: ICard): c is IEvent {
        return c.card_type == CardType.Event;
    },
};

export {
    IKeeper, ICard, ICharacter, IUpgrade, IArena, IEvent, ISpell, TypeGaurd
}