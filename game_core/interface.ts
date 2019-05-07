import { ActionChain, GetterChain, GetterFunc, ActionFunc } from "./hook";
import { Player, CardType, CardSeries, BattleRole, CharStat, CardStat, GamePhase } from "./enums";

type DataField = number | IKnownCard | IKnownCard[] | boolean | null;

export type Data = {
    [name: string]: (DataField | Data | ({ [index: number]: DataField }));
}

interface IKeeper { };
interface ICard {
    readonly card_type: CardType;
    readonly seq: number;
    dangerouslySetSeq(seq: number): void,
    readonly owner: Player;
    card_status: CardStat;
    isEqual(card: any): boolean;
}

type Ability = {
    description: string,
    can_play_phase: GamePhase[];
    canTrigger: (nonce: number) => boolean,
    func: (nonce: number) => void|Promise<void>,
    instance?: boolean,
    cost?: number,
};

interface IKnownCard extends ICard {
    readonly tested: boolean;
    readonly abs_name: string; // 用來唯一辨別一張卡牌的名字
    readonly name: string; // 顯示用的名字，可能是不同語言
    readonly description: string;
    readonly deck_count: number;
    readonly basic_mana_cost: number;
    readonly series: CardSeries[];
    readonly can_play_phase: GamePhase[];
    readonly instance: boolean;

    readonly data: Data;

    readonly check_before_play_chain: GetterChain<boolean, null>;
    readonly get_mana_cost_chain: GetterChain<number, null>;
    readonly card_play_chain: ActionChain<null>;
    /** 只要從場上離開，不論退場還是消滅都會觸發這條 */
    readonly card_leave_chain: ActionChain<CardStat>;
    /** 只有退場會觸發這條效果 */
    readonly card_retire_chain: ActionChain<null>;

    readonly abilities: Array<Ability>;

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
    setupAliveEffect(): void;
    /** 退場曲的概念 */
    onRetrieve(): Promise<void>|void;

    /** 記憶與恢復變數，理論上只有前端會用到（因為後端檢查沒過會直接爆錯） */
    rememberDatas(): void;
    recoverDatas(): void;
}
interface ICharacter extends IKnownCard { };
interface IUpgrade extends IKnownCard { };
interface IArena extends IKnownCard { };
interface IEvent extends IKnownCard { };
interface ISpell extends IKnownCard { };

interface IUpgrade extends IKnownCard {
    readonly card_type: CardType.Upgrade;
    readonly basic_strength: number;
    readonly get_strength_chain: GetterChain<number, ICharacter|undefined>;
    readonly assault: boolean;
    readonly data: Data & {
        character_equipped: null | ICharacter
    }
}
interface ICharacter extends IKnownCard {
    readonly card_type: CardType.Character;
    readonly basic_strength: number;
    readonly basic_battle_role: BattleRole;
    readonly upgrade_list: IUpgrade[];
    char_status: CharStat;
    is_tired: boolean;
    
    readonly assault: boolean;

    readonly change_char_tired_chain: ActionChain<boolean>;
    readonly get_strength_chain: GetterChain<number, ICharacter|undefined>;
    readonly enter_arena_chain: ActionChain<IArena>;
    readonly get_battle_role_chain: GetterChain<BattleRole, null>;
    readonly repulse_chain: ActionChain<ICharacter[]>;

    readonly incited_chain: ActionChain<null>;
    readonly release_chain: ActionChain<null>;

    readonly exploit_chain: ActionChain<IArena>;
    readonly enter_chain: ActionChain<IArena>;
    readonly get_exploit_cost_chain: GetterChain<number, IArena>;
    readonly get_enter_cost_chain: GetterChain<number, IArena>;

    readonly get_push_cost_chain: GetterChain<number, IEvent>;
    readonly push_chain: ActionChain<IEvent>;
    readonly finish_chain: ActionChain<IEvent>;

    readonly data: Data & {
        arena_entered: null | IArena,
        str_counter: number
    }
    /** 不可覆寫！ */
    setUpgrade(upgrade: IUpgrade): void;
    unsetUpgrade(u: IUpgrade): void;
}

interface IArena extends IKnownCard {
    readonly card_type: CardType.Arena;
    readonly char_list: Array<ICharacter|null>;
    readonly basic_exploit_cost: number;
    readonly max_capacity: number;

    readonly data: Data & {
        position: number
    };

    readonly exploit_chain: ActionChain<ICharacter|Player>;
    readonly enter_chain: ActionChain<ICharacter>;
    readonly get_exploit_cost_chain: GetterChain<number, ICharacter|Player>;
    readonly get_enter_cost_chain: GetterChain<number, ICharacter>;

    /**
     * @param char 如果是玩家，代表是利用某些效果不靠角色就使用場所
     * @returns 回傳值如果是數字，代表的是魔力收入 
     */
    onExploit(char: ICharacter|Player, nonce: number): Promise<void|number>|void|number;
    /** 不可覆寫！ */
    enter(char: ICharacter): void;
    exit(char: ICharacter): void;
    find(tar: ICharacter | null): number;
}
interface IEvent extends IKnownCard {
    readonly card_type: CardType.Event;
    readonly goal_progress_count: number;
    readonly cur_progress_count: number;
    readonly init_time_count: number;
    readonly cur_time_count: number;
    readonly push_cost: number;
    readonly score: number;
    readonly is_ending: boolean;
    is_finished: boolean;

    readonly get_push_cost_chain:  GetterChain<number, ICharacter|null>
    readonly add_progress_chain: ActionChain<{ char: ICharacter | null, n: number, is_push: boolean }>
    readonly fail_chain: ActionChain<null>;
    readonly finish_chain: ActionChain<ICharacter|null>;
    readonly add_countdown_chain: ActionChain<{ n: number, is_natural: boolean }>;

    // TODO: 應該要再一個函式 initBeforePush
    checkCanPush(char: ICharacter|null, nonce: number): boolean;
    onPush(char: ICharacter|null, nonce: number): Promise<void>|void;
    onFinish(char: ICharacter|null): Promise<void>|void;
    onFail(): Promise<void>|void;
    setupFinishEffect(char: ICharacter|null): Promise<void>|void;

    /** 不可覆寫！ */
    setProgrss(progress: number): void;
    /** 不可覆寫！ */
    setTimeCount(time_count: number): void;
}
interface ISpell extends IKnownCard {
    readonly card_type: CardType.Spell;
    readonly max_caster: number;
    readonly min_caster: number;
    readonly data: Data & {
        casters: ICharacter[]
    };
}

const TypeGaurd = {
    isUnknown: function (c: ICard): c is UnknownCard {
        return c.card_type == CardType.Unknown;
    },
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
    isCard: function(c: any): c is ICard {
        if(c && typeof(c) == "object") {
            if(c instanceof Card) {
                return true;
            }
        }
        return false;
    },
    isSameCard<T extends IKnownCard>(card: T, target: any): target is T {
        if(TypeGaurd.isCard(target) && TypeGaurd.isKnown(target)) {
            return card.abs_name == target.abs_name;
        } else {
            return false;
        }
    }
};

abstract class Card implements ICard {
    public abstract card_type: CardType;
    public card_status = CardStat.Deck;
    private _seq: number;
    public get seq() { return this._seq; }
    constructor(seq: number, public readonly owner: Player) { this._seq = seq; }
    isEqual(obj: any): boolean {
        if(TypeGaurd.isCard(obj)) {
            return this.seq == obj.seq;
        } else {
            return false;
        }
    }
    dangerouslySetSeq(seq: number) {
        this._seq = seq;
    }
}

class UnknownCard extends Card implements ICard {
    public readonly card_type = CardType.Unknown;
}

type Caller = IKnownCard | IKnownCard[] | null;

type _KnownStat = CardStat.Onboard | CardStat.Retired;
type _UnKnownStat = CardStat.Deck | CardStat.Hand;
type SelectConfig<T extends IKnownCard, Stat extends CardStat = CardStat> = {
    guard: (c: IKnownCard) => c is T,
    stat: Stat,
    check: (c: T) => boolean,
    count: number
    must_have_value: boolean,
    owner?: Player,
    is_tired?: boolean,
    char_stat?: CharStat,
    is_finished?: boolean
};
type _BasicKnownConfig<T extends IKnownCard> = {
    guard: (c: IKnownCard) => c is T,
    /** 默認值：OnBoard */
    stat?: _KnownStat,
    /** 默認值：皆可 */
    owner?: Player,
    /** 默認值：() => true */
    check?: (c: T) => boolean,
    /** 默認值：false */
    must_have_value?: boolean
    /** 默認值：1 */
    count?: number
}
type _UnKnownConfig<T extends IKnownCard> = {
    guard: (c: IKnownCard) => c is T,
    stat: _UnKnownStat,
    owner: Player,
    check?: (c: T) => boolean,
    must_have_value?: boolean
    count?: number
}
type _KnownCharConfig = _BasicKnownConfig<ICharacter>
    & { is_tired?: boolean, char_stat?: CharStat };
type _KnownEventConfig = _BasicKnownConfig<IEvent>
    & { is_finished?: boolean };


/** 用來設置默認值 */
export function buildConfig(arg: _KnownCharConfig): SelectConfig<ICharacter, _KnownStat>;
export function buildConfig(arg: _KnownEventConfig): SelectConfig<IEvent, _KnownStat>;
export function buildConfig<T extends IKnownCard>(
    arg: _BasicKnownConfig<T>): SelectConfig<T, _KnownStat>;
export function buildConfig<T extends IKnownCard>(
    arg: _UnKnownConfig<T>): SelectConfig<T, _UnKnownStat>
export function buildConfig<T extends IKnownCard>(arg: Partial<SelectConfig<T>>) {
    return {
        ...arg,
        stat: typeof arg.stat == "undefined" ? CardStat.Onboard : arg.stat,
        check: typeof arg.check == "undefined" ? () => true : arg.check,
        must_have_value: typeof arg.must_have_value == "undefined" ? false : arg.must_have_value,
        count: typeof arg.count == "undefined" ? 1 : arg.count
    };
}

interface ISelecter {
    selectCard<T extends IKnownCard>(player: Player,
        caller: Caller, conf: SelectConfig<T, _KnownStat>
    ): Promise<T | null>;
    selectCard<T extends IKnownCard>(player: Player,
        caller: Caller, conf: SelectConfig<T, _UnKnownStat>
    ): Promise<T | UnknownCard | null>;

    selectCardInteractive: ISelecter["selectCard"];

    selectText(player: Player, caller: IKnownCard | null, text: string[]): Promise<number | null>;
    selectConfirm(player: Player, caller: IKnownCard | null, msg: string): Promise<boolean>;
    setCardTable(table: { [index: number]: ICard }): void;
    /** 
     * @param msg 若為 null 代表不顯示取消的UI，隨處點擊即可取消
     */
    cancelUI(msg?: string | null): ISelecter;
    promptUI(msg: string | null): ISelecter;
}

export {
    ICard, IKeeper, IKnownCard, ICharacter,
    IUpgrade, IArena, IEvent, ISpell, UnknownCard, Card,
    TypeGaurd, ISelecter, Ability, SelectConfig
};