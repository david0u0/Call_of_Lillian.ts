import * as PIXI from "pixi.js";

import { ICharacter, TypeGaurd as TG } from "../../game_core/interface";
import { Player, CardSeries, CardStat, CharStat, GamePhase } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter, { SelectState } from "./frontend_selecter";
import { BadOperationError } from "../../game_core/errors";
import { CharUI } from "./draw_card";
import { DetailedWarPhase } from "../../game_core/master/war_master";

const CHAR_CONF = {
    guard: TG.isCharacter,
    stat: CardStat.Onboard
};

export class FrontendWarMaster {
    public view = new PIXI.Container();

    private lines = new Array<PIXI.Graphics>();
    private char_ui_table: { [seq: number]: CharUI } = {};
    private selecting = false;

    public register(char: ICharacter, char_ui: CharUI) {
        let w_master = this.gm.w_master;
        this.char_ui_table[char.seq] = char_ui;
        char_ui.setOnclick(evt => {
            if(this.selecter.selecting != SelectState.Card && !this.selecting) {
                if(w_master.detailed_phase == DetailedWarPhase.Attaking
                    && w_master.checkCanAttack(char)
                ) {
                    this.selecting = true;
                    evt.stopPropagation();
                    this.attacking.push(char);
                    this.selectAttack().then(() => this.selecting = false);
                    return true;
                } else if(w_master.detailed_phase == DetailedWarPhase.Blocking
                    && w_master.checkCanBlock(char)
                ) {
                    this.selecting = true;
                    evt.stopPropagation();
                    this.selectBlock(char).then(() => this.selecting = false);
                    return true;
                }
            }
        });
    }
    public getPos(char: ICharacter) {
        let ui = this.char_ui_table[char.seq];
        if(ui) {
            let view = ui.view;
            return { x: view.worldTransform.tx + view.width / 2, y: view.worldTransform.ty };
        } else {
            throw new BadOperationError("未經註冊就要求位置", char);
        }
    }

    private drawConflictLine() {
        let table = this.gm.w_master.conflict_table;
        for(let line of this.lines) {
            line.destroy();
        }
        this.lines = [];
        for(let atk_seq in table) {
            let atk = this.gm.card_table[atk_seq];
            let def = table[atk_seq];
            if(TG.isCharacter(atk)) {
                let atk_pos = this.getPos(atk);
                let def_pos = this.getPos(def);
                let line = new PIXI.Graphics();
                if(def.isEqual(this.gm.w_master.target)) {
                    line.lineStyle(4, 0xf36299, 1);
                } else {
                    line.lineStyle(4, 0xf3d762, 1);
                }
                line.moveTo(atk_pos.x, atk_pos.y);
                line.lineTo(def_pos.x, def_pos.y);
                this.view.addChild(line);
                this.lines.push(line);
            }
        }
    }

    async loopStopWarBtn() {
        this.selecter.stopConfirm();
        while(true) {
            let res = await this.selecter.selectConfirm(this.gm.w_master.atk_player, null, "結束戰鬥");
            if(res) {
                let end_war_success = await this.gm.w_master.endWar(true);
                if(end_war_success) {
                    break;
                }
            } else {
                break;
            }
        }
    }
    async doConflictBtn() {
        this.selecter.stopConfirm();
        let res = await this.selecter
        .selectConfirm(this.gm.w_master.def_player, null, "開始衝突");
        if(res) {
            await this.gm.w_master.startConflict();
        }
    }

    private highlightAvailableChars() {
        if(this.gm.t_master.cur_phase != GamePhase.InWar) {
            return;
        }
        let wm = this.gm.w_master;
        let chars = this.gm.getAll(TG.isCharacter, ch => ch.char_status == CharStat.InWar);
        for(let ch of chars) {
            let highlight = false;
            if(wm.detailed_phase == DetailedWarPhase.Attaking
                || wm.detailed_phase == DetailedWarPhase.Conflict
            ) {
                if(wm.checkCanAttack(ch) || wm.checkCanAttack([], ch)) {
                    highlight = true;
                }
            } else if(wm.checkCanBlock(ch) && wm.detailed_phase == DetailedWarPhase.Blocking) {
                highlight = true;
            }
            
            if(highlight) {
                this.char_ui_table[ch.seq].highlight();
            } else {
                this.char_ui_table[ch.seq].highlight(false, true);
            }
        }
    }
    
    constructor(private me: Player, private gm: GameMaster, private selecter: FrontendSelecter) {
        gm.acf.setAfterEffect(() => this.highlightAvailableChars());
        gm.w_master.declare_war_chain.appendDefault(({ declarer }) => {
            //if(declarer == me)
            // 確實是由我宣告的戰爭
            this.loopStopWarBtn();
        });
        gm.w_master.start_attack_chain.appendDefault(() => {
            this.drawConflictLine();
            this.doConflictBtn();
        });
        gm.w_master.set_block_chain.appendDefault(async () => {
            this.drawConflictLine();
            this.doConflictBtn();
        });
        gm.w_master.before_conflict_chain.appendDefault(() => {
            for(let line of this.lines) {
                line.destroy();
            }
            this.lines = [];
        });
        gm.w_master.after_conflict_chain.appendDefault(() => {
            this.loopStopWarBtn();
        });
        gm.w_master.end_war_chain.appendDefault(() => {
            let chars = this.gm.getAll(TG.isCharacter, ch => ch.char_status == CharStat.InWar);
            for(let ch of chars) {
                this.char_ui_table[ch.seq].highlight(false, true);
            }
        });
    }

    private attacking = new Array<ICharacter>();
    private async selectAttack() {
        this.selecter.stopConfirm();
        let w_master = this.gm.w_master;
        let target: ICharacter = null;
        while(true) {
            let ch = await this.selecter
            .selectCard(w_master.atk_player, this.attacking, CHAR_CONF, _ch => {
                if(w_master.checkCanAttack(_ch)) {
                    return true;
                } else if(w_master.checkCanAttack(this.attacking, _ch)) {
                    if(this.attacking.length > 0) {
                        return true;
                    } else {
                        return false;
                    }
                }
            });
            if(ch) {
                if(w_master.checkCanAttack(ch)) {
                    // 是攻擊者
                    let cancel = false;
                    for(let i = 0; i < this.attacking.length; i++) {
                        if(this.attacking[i].isEqual(ch)) {
                            // 取消該角色的攻擊
                            this.attacking = [...this.attacking.slice(0, i), ...this.attacking.slice(i+1)];
                            cancel = true;
                            break;
                        }
                    }
                    if(!cancel) {
                        this.attacking.push(ch);
                    } else if(this.attacking.length == 0) {
                        return; // 攻擊列表空了，結束選擇
                    }
                } else {
                    // 是目標
                    target = ch;
                    break;
                }
            } else {
                break;
            }
        }
        if(target) {
            if(this.attacking.length) {
                // 開始攻擊
                await this.gm.w_master.startAttack(this.attacking, target);
            }
        } else {
            this.loopStopWarBtn();
        }
        this.attacking = [];
    }
    private async selectBlock(block_char: ICharacter) {
        this.selecter.stopConfirm();
        let wm = this.gm.w_master;
        let atk_char = await this.selecter
        .selectCard(wm.def_player,
            block_char, CHAR_CONF, c => {
                return wm.checkCanBlock(block_char, c);
            }
        );
        await wm.setBlock(atk_char, block_char);
    }
}