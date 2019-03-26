import { ICard, IUpgrade, TypeGaurd as TG, ICharacter, IArena } from "./interface";
import { EventChain } from "./hook";
import { CardStat, CharStat, BattleRole } from "./enums";
import { throwIfIsBackend } from "./errors";

const ENTER_ENEMY_COST = 1;

export default class Rule {
    public static checkPlay(card_play_chain: EventChain<null, ICard>) {
        card_play_chain.appendCheck((can_play, card) => {
            if(TG.isUpgrade(card)) {
                return { var_arg: Rule.checkPlayUpgrade(card) };
            }
        });
    }
    public static onPlay(card_play_chain: EventChain<null, ICard>,
        addCharacter: (ch: ICharacter) => void,
        retireCard: (c: ICard) => void
    ) {
        card_play_chain.append((t, card) => {
            if(TG.isUpgrade(card)) {
                Rule.onPlayUpgrade(card);
            } else if(TG.isCharacter(card)) {
                Rule.onPlayCharacter
            } else if(TG.isArena(card)) {
                // 打出場所的規則（把之前的建築拆了）
                // TODO:
            }
        });
    }
    /** 計算戰鬥職位的通則 */
    public static onGetBattleRole(get_battle_role_chain: EventChain<BattleRole, ICharacter>,
        getStrength: (c: ICharacter) => number
    ) {
        get_battle_role_chain.append((role, char) => {
            if(getStrength(char) == 0) {
                return { var_arg: BattleRole.Civilian };
            }
        });
    }
    /** 進入別人的場所要支付代價 */
    public static onGetEnterCost(get_enter_cost_chain: EventChain<number, { char: ICharacter, arena: IArena }>) {
        get_enter_cost_chain.append((cost, arg) => {
            if (arg.char.owner != arg.arena.owner) {
                return { var_arg: cost + ENTER_ENEMY_COST };
            }
        });
    }
    public static checkEnter(enter_chain: EventChain<null, { char: ICharacter, arena: IArena }>) {
        enter_chain.appendCheck((can_enter, arg) => {
            if(arg.char.char_status != CharStat.StandBy) {
                // 理論上，在場所中的角色不能移動
                throwIfIsBackend("場所中的角色不能移動");
                return { var_arg: false };
            } else if(arg.char.is_tired) {
                // 理論上，疲勞中的角色不能移動
                throwIfIsBackend("疲勞中的角色不能移動");
                return { var_arg: false };
            }
        });
    }
    private static checkPlayUpgrade(u: IUpgrade): boolean {
        // 打出升級卡的限制
        if (u.character_equipped) {
            if (u.character_equipped.card_status != CardStat.Onboard) {
                throwIfIsBackend("指定的角色不在場上", u);
                return false;
            } else if (u.character_equipped.char_status != CharStat.StandBy) {
                throwIfIsBackend("指定的角色不在待命區", u);
                return false;
            } else if (u.character_equipped.owner != u.owner) {
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
    
    private static onPlayUpgrade(u: IUpgrade) {
        if(u.character_equipped) {
            let char = u.character_equipped;
            char.addUpgrade(u);
            // 升級卡離場時，通知角色修改裝備欄
            u.card_leave_chain.append(tmp => {
                // 為了避免不知什麼效果使得裝備離場時的角色與最初的角色不同，這裡再調用一次 character_equipped
                if(u.character_equipped) {
                    u.character_equipped.distroyUpgrade(u);
                }
            });
        }
    }
    private static onPlayCharacter(c: ICharacter,
        addCharacter: (ch: ICharacter) => void,
        retireCard: (c: ICard) => void
    ) {
        // 打出角色後把她加入角色區
        addCharacter(c);
        // 角色離場時銷毀所有裝備
        c.card_leave_chain.append(arg => {
            for (let u of c.upgrade_list) {
                retireCard(u);
            }
        });
    }
}