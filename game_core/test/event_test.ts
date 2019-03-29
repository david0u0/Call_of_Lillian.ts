import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Upgrade } from "../cards"
import { GameMaster } from "../game_master";

import checkBadOperationError from "./check_bad_operation";
import Rainy from "./real_card/character/雨季的魔女．語霽";
import Violatioin from "./real_card/event/違停派對";
import { ICharacter, IEvent } from "../interface";

let p1 = Player.Player1;
let p2 = Player.Player2;
let gm = new GameMaster();
let selecter = gm.selecter;
let pm = gm.getMyMaster(p1);
let enemy_master = gm.getEnemyMaster(p1);
let char: ICharacter;
let char2: ICharacter;
let event: IEvent;

describe("測試事件卡功能", () => {
    beforeEach(() => {
        gm = new GameMaster();
        selecter = gm.selecter;
        pm = gm.getMyMaster(p1);
        enemy_master = gm.getEnemyMaster(p1);
        pm.addMana(1000);
        enemy_master.addMana(1000);
    });
    describe("測試基本的事件卡（違停派對）", () => {
        beforeEach(() => {
            char = gm.genCardToHand(p1, (seq, owner, gm) => new Rainy(seq, owner, gm)) as ICharacter;
            char2 = gm.genCardToHand(p1, (seq, owner, gm) => new Rainy(seq, owner, gm)) as ICharacter;
            event = gm.genCardToHand(p1, (seq, owner, gm) => new Violatioin(seq, owner, gm)) as IEvent;
            pm.playCard(char);
            pm.playCard(event);
        });
        it("玩家的魔力應該是1000-4-4+7=999", () => {
            assert.equal(pm.mana, 999);
        });
        it("玩家推進一次之後魔力應該變為999-1=998", () => {
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char);
            assert.equal(pm.mana, 998);
        });
        it("推進一次之後進度應該變成1", () => {
            assert.equal(event.cur_progress_count, 0);
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char);
            assert.equal(event.cur_progress_count, 1);
        });
        it("推進一次之後角色應該陷入疲勞", () => {
            assert.equal(char.is_tired, false);
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char);
            assert.equal(char.is_tired, true);
        });
        it("推進兩次之後會成功，魔力應該變為999-4-1-1+5=998，總分變成1", () => {
            assert.equal(pm.getScore(), 0, "一開始總分不為0");
            pm.playCard(char2);
            assert.equal(pm.mana, 999-4, "打出角色後魔力不對");
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char);
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char2);
            assert.equal(pm.mana, 998, "完成事件後魔力不對");
            assert.equal(pm.getScore(), 1, "完成後總分不對");
            assert.equal(event.card_status, CardStat.Finished, "完成後事件沒有標記為完成");
        });
        it("事件如果失敗，魔力應該變成999-4-2=993", () => {
            assert.equal(pm.mana, 999, "事件失敗前魔力不對");
            pm.failEvent(event);
            assert.equal(pm.mana, 993, "事件失敗後魔力不對");
        });
    });
});