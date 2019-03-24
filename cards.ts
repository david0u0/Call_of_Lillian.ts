import { CardType, CardSeries, Player, BattleRole, CharStat, CardStat } from "./enums";
import { ICard, ICharacter, IUpgrade, IArena, ISpell } from "./interface";
import { GameMaster } from "./game_master";
import { EventChain, HookResult } from "./hook";
import Selecter from "./selecter";

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

    recoverCancelPlay() {
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
    public readonly add_upgrade_chain = new EventChain<IUpgrade>();
    public readonly enter_arena_chain = new EventChain<IArena>();
    public readonly attack_chain = new EventChain<ICharacter>();

    addUpgrade(u: IUpgrade) {
        this.add_upgrade_chain.trigger(u);
        this._upgrade_list.push(u);
    }
}

export { Card, Upgrade, Character };