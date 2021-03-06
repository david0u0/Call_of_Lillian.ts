import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Upgrade } from "../cards";
import { GameMaster } from "../master/game_master";
import { ICharacter, IEvent, IArena } from "../interface";

import { checkBadOperationError, checkBadOperationErrorAsync } from "./check_bad_operation";
import { TestSelecter, genFunc } from "./mocking_tools";

import H from "../real_card/arena/M市立綜合醫院";

function genHospital(owner: Player, gm: GameMaster, pos: number) {
    return () => {
        let arena = new H(-1, owner, gm, "");
        arena.data.position = pos;
        return arena;
    };
}

let p1 = Player.Player1;
let p2 = Player.Player2;

let selecter = new TestSelecter();
let gm = new GameMaster(selecter, genFunc);

let pm = gm.getMyMaster(p1);
let enemy_master = gm.getEnemyMaster(p1);
let char: ICharacter;
let char2: ICharacter;
let event: IEvent;

describe("測試事件卡功能", () => {
    beforeEach(async () => {
        selecter = new TestSelecter();
        gm = new GameMaster(selecter, genFunc);
        pm = gm.getMyMaster(p1);
        enemy_master = gm.getEnemyMaster(p1);
        await pm.addMana(1000);
        await enemy_master.addMana(1000);
        char = await gm.genCardToHand(p1, "雨季的魔女．語霽") as ICharacter;
        char2 = await gm.genCardToHand(p1, "雨季的魔女．語霽") as ICharacter;

        await gm.t_master.startMainPhase();
        await gm.t_master.startTurn(p1);
        await gm.t_master.addActionPoint(100);
        await pm.playCard(char);
        await pm.playCard(char2);
    });
    describe("測試基本的事件卡（違停派對）", () => {
        beforeEach(async () => {
            event = await gm.genCardToHand(p1, "違停派對") as IEvent;
            await pm.playCard(event);
        });
        it("玩家推進一次之後魔力應該減1", async () => {
            let mana = pm.mana;
            await pm.addEventProgress(event, char, true);
            assert.equal(pm.mana, mana - 1);
        });
        it("推進一次之後進度應該變成1", async () => {
            assert.equal(event.cur_progress_count, 0);
            await pm.addEventProgress(event, char, true);
            assert.equal(event.cur_progress_count, 1);
        });
        it("推進一次之後角色應該陷入疲勞", async () => {
            assert.equal(char.is_tired, false);
            await pm.addEventProgress(event, char, true);
            assert.equal(char.is_tired, true);
        });
        it("陷入疲勞的角色應該無法推進", async () => {
            await pm.changeCharTired(char, true);
            await checkBadOperationErrorAsync(async () => {
                await pm.addEventProgress(event, char, true);
            });
        });
        it("推進兩次之後會成功，魔力應該變為-1-1+5總共加3，總分變成1", async () => {
            assert.equal(pm.getScore(), 0, "一開始總分不為0");
            let mana = pm.mana;
            await pm.addEventProgress(event, char, true);
            await pm.addEventProgress(event, char2, true);
            assert.equal(pm.mana, mana+3, "完成事件後魔力不對");
            assert.equal(pm.getScore(), 1, "完成後總分不對");
            assert.equal(event.is_finished, true, "完成後事件沒有標記為完成");
        });
        it("事件如果失敗，魔力應該-4", async () => {
            let mana = pm.mana;
            await pm.failEvent(event);
            assert.equal(pm.mana, mana - 4, "事件失敗後魔力不對");
        });
    });
    describe("測試比較複雜的事件（會根據場地狀況來判斷可不可推進）", () => {
        let hospital: IArena;
        let e_hospital: IArena;
        beforeEach(async () => {
            event = await gm.genCardToHand(p1, "緊急醫療") as IEvent;
            await pm.playCard(event);
            hospital = await gm.genCardToBoard(p1, genHospital(p1, gm, 3));
            e_hospital = await gm.genCardToBoard(p2, genHospital(p2, gm, 3));
        });
        it("進入醫院前應該無法推進", async () => {
            await checkBadOperationErrorAsync(async () => {
                await pm.addEventProgress(event, char, true);
            });
        });
        it("進入醫院後應該就可以推進了", async () => {
            await pm.enterArena(hospital, char);
            await checkBadOperationErrorAsync(async () => {
                await pm.addEventProgress(event, char2, true);
            }, false);
        });
        it("進入敵方的醫院應該也可以推進了", async () => {
            await pm.enterArena(e_hospital, char);
            await checkBadOperationErrorAsync(async () => {
                await pm.addEventProgress(event, char2, true);
            }, false);
        });
    });
});