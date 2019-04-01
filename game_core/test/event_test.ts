import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Upgrade } from "../cards";
import { GameMaster } from "../game_master";
import { ICharacter, IEvent, IArena } from "../interface";

import checkBadOperationError from "./check_bad_operation";
import Rainy from "./real_card/character/雨季的魔女．語霽";
import Violatioin from "./real_card/event/違停派對";
import Emergency from "./real_card/event/緊急醫療";
import Hospital from "./real_card/arena/M市立綜合醫院";

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
        char = gm.genCardToHand(p1, (seq, owner, gm) => new Rainy(seq, owner, gm)) as ICharacter;
        char2 = gm.genCardToHand(p1, (seq, owner, gm) => new Rainy(seq, owner, gm)) as ICharacter;
        pm.playCard(char);
        pm.playCard(char2);
    });
    describe("測試基本的事件卡（違停派對）", () => {
        beforeEach(() => {
            event = gm.genCardToHand(p1, (seq, owner, gm) => new Violatioin(seq, owner, gm)) as IEvent;
            pm.playCard(event);
        });
        it("玩家的魔力應該是1000-4-4-4+7=995", () => {
            assert.equal(pm.mana, 995);
        });
        it("玩家推進一次之後魔力應該變為995-1=994", () => {
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char);
            assert.equal(pm.mana, 994);
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
        it("陷入疲勞的角色應該無法推進", () => {
            pm.changeCharTired(char, true);
            selecter.setSelectedSeqs(event.seq);
            checkBadOperationError(() => {
                pm.pushEvent(char);
            });
        });
        it("推進兩次之後會成功，魔力應該變為995-1-1+5=998，總分變成1", () => {
            assert.equal(pm.getScore(), 0, "一開始總分不為0");
            assert.equal(pm.mana, 995, "打出角色後魔力不對");
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char);
            selecter.setSelectedSeqs(event.seq);
            pm.pushEvent(char2);
            assert.equal(pm.mana, 998, "完成事件後魔力不對");
            assert.equal(pm.getScore(), 1, "完成後總分不對");
            assert.equal(event.card_status, CardStat.Finished, "完成後事件沒有標記為完成");
        });
        it("事件如果失敗，魔力應該變成995-4-2=989", () => {
            assert.equal(pm.mana, 995, "事件失敗前魔力不對");
            pm.failEvent(event);
            assert.equal(pm.mana, 989, "事件失敗後魔力不對");
        });
    });
    describe("", () => {
        let hospital: IArena;
        let e_hospital: IArena;
        beforeEach(() => {
            event = gm.genCardToHand(p1, (seq, owner, gm) => new Emergency(seq, owner, gm)) as IEvent;
            pm.playCard(event);
            hospital = gm.genArenaToBoard(p1, 3, (seq, owner, gm) => {
                return new Hospital(seq, owner, gm);
            });
            e_hospital = gm.genArenaToBoard(p2, 3, (seq, owner, gm) => {
                return new Hospital(seq, owner, gm);
            });
        });
        it("玩家的魔力應該是1000-4-4-4=988", () => {
            assert.equal(pm.mana, 988);
        });
        it("進入醫院前應該無法推進", () => {
            checkBadOperationError(() => {
                selecter.setSelectedSeqs(event.seq);
                pm.pushEvent(char);
            });
        });
        it("進入醫院後應該就可以推進了", () => {
            selecter.setSelectedSeqs(hospital.seq);
            gm.enterArena(char);
            assert.doesNotThrow(() => {
                selecter.setSelectedSeqs(event.seq);
                pm.pushEvent(char2);
            });
        });
        it("進入敵方的醫院應該也可以推進了", () => {
            selecter.setSelectedSeqs(e_hospital.seq);
            gm.enterArena(char);
            assert.doesNotThrow(() => {
                selecter.setSelectedSeqs(event.seq);
                pm.pushEvent(char2);
            });
        });
    });
});