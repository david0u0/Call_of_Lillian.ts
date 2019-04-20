import * as PIXI from "pixi.js";

import { ICharacter, TypeGaurd as TG } from "../../game_core/interface";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter from "./frontend_selecter";

export class FrontendWarMaste {
    public view = new PIXI.Container();

    private line_table: { [atk_seq: number]: PIXI.Graphics } = {};

    constructor(private me: Player, private gm: GameMaster, private selecter: FrontendSelecter) {
        gm.w_master.declare_war_chain.append(({ declarer }) => {
            //if(declarer == me) {
            // 確實是由我宣告的戰爭
            this.selectAttack();
            //}
        });
        gm.w_master.start_attack_chain.append(({ atk_chars, target }) => {
            let atk_pos = selecter.getPos(atk_chars);
            let target_pos = selecter.getPos(target)[0];
            this.line_table = {};
            for(let [i, pos] of atk_pos.entries()) {
                let line = new PIXI.Graphics();
                line.lineStyle(4, 0xf36299, 1);
                line.moveTo(pos.x, pos.y);
                line.lineTo(target_pos.x, target_pos.y);
                this.view.addChild(line);
                this.line_table[atk_chars[i].seq] = line;
            }

        });
        gm.w_master.set_block_chain.append(({ atk_char, block_char }) => {
            let atk_pos = selecter.getPos(atk_char)[0];
            let blocker_pos = selecter.getPos(block_char)[0];

            let line = this.line_table[atk_char.seq];
            if(line) {
                line.clear();
                line.lineStyle(4, 0xf3d762, 1);
                line.moveTo(atk_pos.x, atk_pos.y);
                line.lineTo(blocker_pos.x, blocker_pos.y);
                this.view.addChild(line);
            }
        });
        gm.w_master.before_conflict_chain.append(() => {
            for(let seq in this.line_table) {
                this.line_table[seq].clear();
                delete this.line_table[seq];
            }
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
                    this.attacking.push(ch);
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
            // 結束戰鬥 TODO: 應該跳個訊息問是不是真的要結束
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
                // TODO: 這裡目前還不能「取消選取」，一旦被選去格擋就結束了
                let _block_char = block_char;
                let atk_char = await this.selecter.selectCard(
                    wm.def_player, _block_char, TG.isCharacter, c => {
                        return wm.checkCanBlock(_block_char, c);
                    }
                );
                if(atk_char) {
                    wm.setBlock(atk_char, block_char);
                }
            } else {
                break;
            }
        }
        await wm.startConflict();
        await this.selectAttack();
    }
}