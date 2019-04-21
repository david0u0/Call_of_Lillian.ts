import * as PIXI from "pixi.js";

import { ICharacter, TypeGaurd as TG } from "../../game_core/interface";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter from "./frontend_selecter";

export class FrontendWarMaste {
    public view = new PIXI.Container();

    private lines = new Array<PIXI.Graphics>();

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
                let atk_pos = this.selecter.getPos(atk)[0];
                let def_pos = this.selecter.getPos(def)[0];
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

    constructor(private me: Player, private gm: GameMaster, private selecter: FrontendSelecter) {
        gm.w_master.declare_war_chain.append(({ declarer }) => {
            //if(declarer == me) {
            // 確實是由我宣告的戰爭
            this.selectAttack();
            //}
        });
        gm.w_master.start_attack_chain.append(() => {
            this.drawConflictLine();
        });
        gm.w_master.set_block_chain.append(() => {
            this.drawConflictLine();
        });
        gm.w_master.before_conflict_chain.append(() => {
            for(let line of this.lines) {
                line.destroy();
            }
            this.lines = [];
        });
    }

    private attacking = new Array<ICharacter>();
    private async selectAttack() {
        let w_master = this.gm.w_master;
        this.attacking = [];
        let target: ICharacter = null;
        while(true) {
            let ch = await this.selecter
            .cancelUI("結束戰鬥")
            .selectCard(this.me, this.attacking, TG.isCharacter, _ch => {
                if(w_master.checkCanAttack(_ch)) {
                    return true;
                } else if(w_master.checkCanAttack(this.attacking, _ch)) {
                    return true;
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
                this.gm.w_master.startAttack(this.attacking, target);
            }
            this.selectBlock();
        } else {
            w_master.endWar();
        }
    }
    private async selectBlock() {
        let wm = this.gm.w_master;
        while(true) {
            let block_char = await this.selecter
            .cancelUI("進入衝突階段")
            .selectCard(wm.def_player, [],
                TG.isCharacter, c => {
                    return wm.checkCanBlock(c);
                }
            );
            if(block_char) {
                let _block_char = block_char;
                let atk_char = await this.selecter.selectCard(
                    wm.def_player, _block_char, TG.isCharacter, c => {
                        return wm.checkCanBlock(_block_char, c);
                    }
                );
                wm.setBlock(atk_char, block_char);
            } else {
                break;
            }
        }
        await wm.startConflict();
        await this.selectAttack();
    }
}