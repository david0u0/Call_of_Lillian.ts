import * as PIXI from "pixi.js";

import { ICharacter, TypeGaurd as TG } from "../../game_core/interface";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter from "./frontend_selecter";

export class FrontendWarMaste {
    public view = new PIXI.Container();

    private lines = new Array<PIXI.Graphics>();

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
            this.lines = [];
            for(let pos of atk_pos) {
                let line = new PIXI.Graphics();
                line.lineStyle(4, 0xf36299, 1);
                line.moveTo(pos.x, pos.y);
                line.lineTo(target_pos.x, target_pos.y);
                this.view.addChild(line);
                this.lines.push(line);
            }

        });
        gm.w_master.start_block_chain.append(({ atk_chars, atk_block_table }) => {

        });
    }

    private attacking = new Array<ICharacter>();
    private async selectAttack() {
        let w_master = this.gm.w_master;
        this.attacking = [];
        let target: ICharacter = null;
        while(true) {
            let ch = await this.selecter.selectCard(this.me, this.attacking, TG.isCharacter, _ch => {
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
            this.selectAttack();
        } else {
            // 結束戰鬥 TODO: 應該跳個訊息問是不是真的要結束
            let res = confirm("確定要結束戰鬥？");
            if(res) {
                w_master.endWar();
            } else {
                this.selectAttack();
            }
        }
    }
}