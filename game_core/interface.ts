import { ActionChain, GetterChain, GetterFunc, ActionFunc } from "./hook";
import { Player, CardType, CardSeries, BattleRole, CharStat, CardStat, GamePhase } from "./enums";

interface IKeeper { };
interface ICard {
    readonly card_type: CardType;
    readonly seq: number;
    readonly owner: Player;
    card_status: CardStat;
}

type Ability = {
    description: string,
    can_play_phase: GamePhase[];
    canTrigger: () => boolean,
    func: () => void|Promise<void>,
    instance?: boolean,
    cost?: number,
};

interface IKnownCard extends ICard {
    readonly name: string;
    readonly description: string;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];
    readonly can_play_phase: GamePhase[];
    readonly instance: boolean;

    readonly check_before_play_chain: GetterChain<boolean, null>;
    readonly get_mana_cost_chain: GetterChain<number, null>;
    readonly card_play_chain: ActionChain<null>;
    /** 只要從場上離開，不論退場還是消滅都會觸發這條 */
    readonly card_leave_chain: ActionChain<null>;
    /** 只有退場會觸發這條效果 */
    readonly card_retire_chain: ActionChain<null>;

    readonly abilities: Array<Ability>;

    isEqual(card: IKnownCard|null): boolean;

    /**
     * 在打牌之前執行，內部會呼叫選擇器，將該設置的變數設起來。
     * 之所以把這函式放在卡牌中而不是由 GameMaster 來決定，是因為有時候需要客製化每張牌的打牌流程。
     * 例如：施放咒語前指定任意角色，使他們疲勞，每指定一個角色降一費。
     * @returns 如果被取消就會回傳 false
     */
    initialize(): Promise<boolean>|boolean;
    /** 入場曲或咒語效果的概念 */
    onPlay(): Promise<void>|void;
    /** 設置卡牌在場時的效果 */
    setupAliveeEffect(): Promise<void>|void;
    /** 退場曲的概念 */
    onRetrieve(): Promise<void>|void;

    /** 記憶與恢復變數，理論上只有前端會用到（因為後端檢查沒過會直接爆錯） */
    rememberFields(): void;
    recoverFields(): void;

    /**
     * 創造一個新的規則，接上某條規則鏈。當 this 這張卡牌死亡時，該規則也會失效。
     * @param append 若為真就接在尾巴，為否就接在開頭
     * @param chain 欲接上的那條規則鏈
     * @param func 欲接上的規則
     */
    addGetterWhileAlive<T, U>(append: boolean, chain: GetterChain<T, U>[]|GetterChain<T, U>,
        func: GetterFunc<T, U>): void;

    addCheckWhileAlive<U>(append: boolean, chain: ActionChain<U>[]|ActionChain<U>,
        func: GetterFunc<boolean, U>): void

    addActionWhileAlive<U>(append: boolean, chain: ActionChain<U>[]|ActionChain<U>,
        func: ActionFunc<U>): void

}
interface ICharacter extends IKnownCard { };
interface IUpgrade extends IKnownCard { };
interface IArena extends IKnownCard { };
interface IEvent extends IKnownCard { };
interface ISpell extends IKnownCard { };

interface IUpgrade extends IKnownCard {
    readonly basic_strength: number;
    readonly character_equipped: ICharacter|null;
}
interface ICharacter extends IKnownCard {
    readonly basic_strength: number;
    readonly basic_battle_role: BattleRole;
    readonly upgrade_list: IUpgrade[];
    arena_entered: IArena|null;
    char_status: CharStat;
    is_tired: boolean;
    
    readonly assault: boolean;

    readonly has_char_action: boolean;
    charAction(): void;

    readonly change_char_tired_chain: ActionChain<boolean>;
    readonly get_strength_chain: GetterChain<number, ICharacter|undefined>;
    readonly enter_arena_chain: ActionChain<IArena>;
    readonly attack_chain: ActionChain<ICharacter>;
    readonly get_battle_role_chain: GetterChain<BattleRole, null>;

    readonly exploit_chain: ActionChain<IArena>;
    readonly enter_chain: ActionChain<IArena>;
    readonly get_exploit_cost_chain: GetterChain<number, IArena>;
    readonly get_enter_cost_chain: GetterChain<number, IArena>;

    readonly get_push_cost_chain: GetterChain<number, IEvent>;
    readonly push_chain: ActionChain<IEvent>;
    readonly finish_chain: ActionChain<IEvent>;

    /** 不可覆寫！ */
    addUpgrade(upgrade: IUpgrade): void;
    distroyUpgrade(u: IUpgrade): void;
}

interface IArena extends IKnownCard {
    position: number;
    readonly char_list: Array<ICharacter|null>;
    readonly basic_exploit_cost: number;
    readonly max_capacity: number;

    readonly exploit_chain: ActionChain<ICharacter|Player>;
    readonly enter_chain: ActionChain<ICharacter>;
    readonly get_exploit_cost_chain: GetterChain<number, ICharacter|Player>;
    readonly get_enter_cost_chain: GetterChain<number, ICharacter>;

    /**
     * @param char 如果是玩家，代表是利用某些效果不靠角色就使用場所
     * @returns 回傳值如果是數字，代表的是魔力收入 
     */
    onExploit(char: ICharacter|Player): Promise<void|number>|void|number;
    /** 不可覆寫！ */
    enter(char: ICharacter): void;
    exit(char: ICharacter): void;
    find(tar: ICharacter | null): number;
}
interface IEvent extends IKnownCard {
    readonly goal_progress_count: number;
    readonly cur_progress_count: number;
    readonly init_time_count: number;
    readonly cur_time_count: number;
    readonly push_cost: number;
    readonly score: number;
    readonly is_ending: boolean;

    readonly get_push_cost_chain:  GetterChain<number, ICharacter|null>
    readonly push_chain: ActionChain<ICharacter|null>
    readonly fail_chain: ActionChain<null>;
    readonly finish_chain: ActionChain<ICharacter|null>;

    // TODO: 應該要再一個函式 initBeforePush
    checkCanPush(char: ICharacter|null): boolean;
    onPush(char: ICharacter|null): Promise<void>|void;
    onFinish(char: ICharacter|null): Promise<void>|void;
    onFail(): Promise<void>|void;
    setupFinishEffect(char: ICharacter|null): Promise<void>|void;

    /** 不可覆寫！ */
    push(): void;
    /** 不可覆寫！ */
    countDown(): void;
    /** 不可覆寫！ */
    setProgrss(progress: number): void;
    /** 不可覆寫！ */
    setTimeCount(time_count: number): void;
}
interface ISpell extends IKnownCard {

}

const TypeGaurd = {
    isKnown: function(c: ICard): c is IKnownCard {
        return c.card_type != CardType.Unknown;
    },
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
    isCard: function(c: ICard|null|number|undefined): c is ICard {
        if(c) {
            return typeof(c) == "object";
        } else {
            return false;
        }
    }
};

class UnknownCard implements ICard {
    public readonly card_type = CardType.Unknown;
    public card_status = CardStat.Deck;
    constructor(public readonly seq: number, public readonly owner: Player) { }
}


interface ISelecter {
    selectSingleCard<T extends ICard>(caller: IKnownCard|IKnownCard[]|null,
        guard: (c: ICard) => c is T,
        check: (card: T) => boolean): Promise<T | null>;
    selectSingleCardInteractive<T extends ICard>(player: Player,
        caller: IKnownCard|IKnownCard[]|null,
        guard: (c: ICard) => c is T,
        check: (card: T) => boolean): Promise<T | null>;
    selectText(caller: IKnownCard|null, text: string[]): Promise<number|null>;
    setCardTable(table: { [index: number]: ICard }): void;
}

export {
    ICard, IKeeper, IKnownCard, ICharacter,
    IUpgrade, IArena, IEvent, ISpell, UnknownCard,
    TypeGaurd, ISelecter, Ability
};