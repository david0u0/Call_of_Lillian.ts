import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell } from "./interface";
import { GameMaster } from "./game_master";
import { EventChain, HookResult } from "./hook";
import Selecter from "./selecter";
import { BadOperationError } from "./errors";

abstract class Card implements ICard {
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly basic_mana_cost: number;
    public series: CardSeries[] = []

    public card_status = CardStat.Deck;

    public readonly get_mana_cost_chain = new EventChain<number>();
    public readonly card_play_chain = new EventChain<null>();
    public readonly card_leave_chain = new EventChain<null>();
    public readonly card_retire_chain = new EventChain<null>();

    public initialize() { }
    public onPlay() { }
    public onRetrieve() { }

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: GameMaster) { }

    public isEqual(card: ICard|null) {
        if(card) {
            return this.seq == card.seq;
        } else {
            return false;
        }
    }
    public rememberFields() { }
    public recoverFields() { }

    appendChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void, check?: boolean
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.appendChainWhileAlive(c, func, check);
            }
        } else {
            let hook = check ? chain.appendCheck(func) : chain.append(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
    dominantChainWhileAlive<T>(chain: EventChain<T>[]|EventChain<T>,
        func: (arg: T) => HookResult<T>|void, check?: boolean
    ) {
        if(chain instanceof Array) {
            for(let c of chain) {
                this.dominantChainWhileAlive(c, func, check);
            }
        } else {
            let hook = check ? chain.dominantCheck(func) : chain.dominant(func);
            this.card_leave_chain.append(() => {
                hook.active_countdown = 0;
            });
        }
    }
}

abstract class Upgrade extends Card implements IUpgrade {
    public card_type = CardType.Upgrade;
    public abstract readonly basic_strength: number;
    protected _character_equipped: ICharacter | null = null;
    public get character_equipped() { return this._character_equipped; }

    recoverFields() {
        this._character_equipped = null;
    }

    initialize() {
        let char = this.g_master.selecter.selectChars(1, 1, char => {
            this._character_equipped = char;
            let can_play = this.g_master.getMyMaster(this).checkCanPlay(this);
            this._character_equipped = null;
            return can_play;
        });
        this._character_equipped = char[0];
    }
}

abstract class Character extends Card implements ICharacter {
    public readonly card_type = CardType.Character;
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = BattleRole.Fighter;

    private readonly _upgrade_list: IUpgrade[] = [];
    public get upgrade_list() { return [...this._upgrade_list] };
    public arena_entered: IArena | null = null;
    public char_status = CharStat.StandBy;
    public is_tired = false;

    public has_char_action = false;
    public charAction() { }

    public readonly get_strength_chain = new EventChain<number>();
    public readonly get_infight_strength_chain
        = new EventChain<{ strength: number, enemy: ICharacter }>();
    public readonly get_battle_role_chain = new EventChain<BattleRole>();
    public readonly enter_arena_chain = new EventChain<IArena>();
    public readonly attack_chain = new EventChain<ICharacter>();

    constructor(public readonly seq: number, public readonly owner: Player,
        protected readonly g_master: GameMaster
    ) { 
        super(seq, owner, g_master);
        // 把所有裝備丟掉
        this.card_leave_chain.append(arg => {
            for(let u of this.upgrade_list) {
                this.g_master.getMyMaster(this).retireCard(u);
            }
        });
    }

    /** 不可覆寫！ */
    addUpgrade(u: IUpgrade) {
        this._upgrade_list.push(u);
    }
}

abstract class Arena extends Card implements IArena {
    public readonly card_type = CardType.Arena;
    public readonly positioin = -1;
    public readonly abstract basic_exploit_cost: number;
    private _char_list = new Array<ICharacter>();
    public get char_list() { return [...this._char_list] };
    public readonly max_capacity = 2;
    public readonly exploit_chain = new EventChain<{ cost: number, char: ICharacter }>();
    public readonly enter_chain = new EventChain<{ cost: number, char: ICharacter }>();

    /** 不可覆寫！ */
    enter(char: ICharacter) {
        if(this.char_list.length >= this.max_capacity) {
            throw new BadOperationError("超過場所的人數上限！");
        }
        this._char_list.push(char);
    }
    /** 回傳值如果是數字，代表的是魔力收入 */
    abstract onExploit(): number|void;
}

export { Card, Upgrade, Character, Arena };