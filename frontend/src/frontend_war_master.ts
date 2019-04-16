import { ICharacter, TypeGaurd as TG } from "../../game_core/interface";
import { Player } from "../../game_core/enums";
import { GameMaster } from "../../game_core/master/game_master";
import FrontendSelecter from "./frontend_selecter";

export class FrontendWarMaste {
    private attacking = new Array<ICharacter>();
    constructor(private me: Player, private gm: GameMaster, private selecter: FrontendSelecter) {
        gm.w_master.declare_war_chain.append(({ declarer }) => {
            //if(declarer == me) {
            // 確實是由我宣告的戰爭
            this.selectAttack();
            //}
        });
    }
    private async selectAttack() {
        let w_master = this.gm.w_master;
        this.attacking = [];
        let target: ICharacter = null;
        while(true) {
            let ch = await this.selecter.selectSingleCard(this.attacking, TG.isCharacter, _ch => {
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
                // TODO: 衝突
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