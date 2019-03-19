import {
    Player, CardStat, CardType, CardSeries,
    BattleRole, CharStat,
    ICard, ICharacter, IUpgrade, IArena, ISpell, IGameMaster
} from "./interface";
import { HookChain, HookResult } from "./hook";

class CallbackCycleError extends Error {
    constructor(msg: string) {
        super(msg);
    }
}

abstract class Card implements ICard {
    public abstract readonly card_type: CardType;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly basic_mana_cost: number;

    public readonly card_play_chain: HookChain<void> = new HookChain<void>();
    public readonly card_die_chain: HookChain<void> = new HookChain<void>();

    public series: CardSeries[] = []
    public mana_cost_modifier = 0;

    constructor(public readonly seq: number, public readonly owner: Player) { }

    getManaCost(g_master: IGameMaster): number {
        let final_cost = this.basic_mana_cost + this.mana_cost_modifier;
        return final_cost > 0 ? final_cost : 0;
    }

    private lock_call = false;
    /** 用來避免循環呼叫 */
    preventCycleCall(func: () => void) {
        if(this.lock_call) {
            this.lock_call = false;
            throw new CallbackCycleError("循環呼叫!");
        } else {
            this.lock_call = true;
            func();
            this.lock_call = false;
        }
    }

    appendChainWhileAlive<T>(chain: HookChain<T>, func: (arg: T) => HookResult<T>|void) {
        let hook = chain.append(func, -1);
        this.card_die_chain.append(() => {
            hook.active_count = 0;
            return { did_trigger: true };
        }, 1);
    }
}

abstract class Upgrade extends Card implements IUpgrade {
    public abstract readonly basic_strength: number;
    public readonly card_type = CardType.Upgrade;

    public character_equipped: ICharacter|null = null;

    protected onEquipCustom(g_master: IGameMaster, char: ICharacter) {
        // 舉例：如果是軍火系列的升級，就降一點消費
        // if(char.series.indexOf(CardSeries.War) != -1) {
        //     this.mana_cost_modifier -= 1;
        // }
    }
    onEquip(g_master: IGameMaster, char: ICharacter) {
        this.character_equipped = char;
        this.onEquipCustom(g_master, char);
    }
}

abstract class Character extends Card implements ICharacter {
    public readonly abstract basic_strength: number;
    public readonly basic_battle_role: BattleRole = BattleRole.Fighter;

    public readonly upgrade_list: IUpgrade[] = [];
    public arena_entered: IArena|null = null;
    public status = CharStat.Waiting;

    getStrength(g_master: IGameMaster): number {
        let final_strength = this.basic_strength;
        for(let u of this.upgrade_list) {
            final_strength += u.basic_strength;
        }
        return final_strength > 0 ? final_strength : 0;
    }
    getBattleRole(g_master: IGameMaster): BattleRole {
        return this.getStrength(g_master) > 0 ? BattleRole.Civilian : this.basic_battle_role;
    }
    protected onEquipCustom(upgrade: IUpgrade) {
        // 舉例：如果是軍火系列的升級，就降一點消費
        // if(upgrade.series.indexOf(CardSeries.War) != -1) {
        //     upgrade.mana_cost_modifier -= 1;
        // }
    }

    /** 千萬不可覆寫這個函式! */
    onEquip(g_master: IGameMaster, upgrade: IUpgrade) {
        this.upgrade_list.push(upgrade);
        this.preventCycleCall(() => {
            upgrade.onEquip(g_master, this);
        });
    }
}

export { Card };