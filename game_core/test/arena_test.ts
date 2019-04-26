import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat, GamePhase } from "../enums";
import { GameMaster } from "../master/game_master";

import { checkBadOperationError, checkBadOperationErrorAsync } from "./check_bad_operation";
import { TestSelecter, genFunc } from "./mocking_tools";
import { IArena, ICharacter } from "../interface";

let p1 = Player.Player1;
let p2 = Player.Player2;
let selecter = new TestSelecter();
let gm = new GameMaster(selecter, genFunc);
let pm = gm.getMyMaster(p1);
let enemy_master = gm.getEnemyMaster(p1);

pm.addMana(1000);
enemy_master.addMana(1000);

describe("測試最基礎的場所卡", () => {
    let my_h: IArena;
    let enemy_h: IArena;
    let rainy: ICharacter;
    let rainy2: ICharacter;
    let e_rainy3: ICharacter;
    before(async () => {
        gm.genArenaToBoard(p1, 0, "M市立綜合醫院");
        gm.genArenaToBoard(p1, 1, "M市立綜合醫院");
        my_h = await gm.genArenaToBoard(p1, 2, "M市立綜合醫院");
        gm.genArenaToBoard(p1, 3, "M市立綜合醫院");
        gm.genArenaToBoard(p1, 4, "M市立綜合醫院");
        gm.genArenaToBoard(p2, 0, "M市立綜合醫院");
        gm.genArenaToBoard(p2, 1, "M市立綜合醫院");
        enemy_h = await gm.genArenaToBoard(p2, 2, "M市立綜合醫院");
        gm.genArenaToBoard(p2, 3, "M市立綜合醫院");
        gm.genArenaToBoard(p2, 4, "M市立綜合醫院");
        rainy = (await gm.genCardToHand(p1, "雨季的魔女．語霽")) as ICharacter;
        rainy2 = (await gm.genCardToHand(p1, "雨季的魔女．語霽")) as ICharacter;
        e_rainy3 = (await gm.genCardToHand(p2, "雨季的魔女．語霽")) as ICharacter;
        await pm.playCard(rainy);
        await pm.playCard(rainy2);
        await gm.t_master.startTurn(p2);
        await enemy_master.playCard(e_rainy3);

        await gm.t_master.startMainPhase();
        await gm.t_master.startTurn(p1);
        await gm.t_master.addActionPoint(100);
    });
    it("進入自己場所應該不用花費", () => {
        assert.equal(pm.getEnterCost(rainy, my_h), 0);
    });
    it("進入敵人的場所要多花1魔力", () => {
        assert.equal(pm.getEnterCost(rainy, enemy_h), 1);
    });
    describe("測試進入場所的功能", () => {
        describe("讓角色實際進入場所", () => {
            before(async () => {
                await pm.enterArena(my_h, rainy);
            });
            it("在場所中的角色欲進入場所應該報錯", () => {
                checkBadOperationErrorAsync(async () => {
                    await enemy_master.enterArena(enemy_h, rainy);
                });
            });
            it("角色進入的場所應該是自己的醫院", () => {
                assert.equal(true, my_h.isEqual(rainy.arena_entered));
            });
            it("場所中應該洽好有一個角色", () => {
                assert.equal(true, rainy.isEqual(my_h.char_list[0]));
                assert.equal(true, my_h.char_list[1] == null);
            });
            it("進入時超過場所容納上限應該報錯", async () => {
                await gm.t_master.startTurn(p2);
                await enemy_master.enterArena(my_h, e_rainy3);
                await gm.t_master.startTurn(p1);
                checkBadOperationErrorAsync(async () => {
                    await pm.enterArena(my_h, rainy2);
                });
                await gm.t_master.startTurn(p1);
            });
            it("對手的角色進入我方的場所，其魔力應該為1000-4-1=995", () => {
                assert.equal(995, enemy_master.mana);
            });
            it("由於角色能力，敵人應該承受了一點情緒傷害", () => {
                assert.equal(enemy_master.emo, 1);
                assert.equal(pm.emo, 0);
            });
            describe("測試實際使用場所", () => {
                it("我方的魔力應該是1000-4-4+1=993", () => {
                    assert.equal(993, pm.mana);
                });
                it("我方的情緒應為0", async () => {
                    assert.equal(0, pm.emo);
                });
                it("使用後魔力應該變成993+2=995", async () => {
                    await gm.t_master.startExploit();
                    await pm.exploit(my_h, rainy);
                    assert.equal(995, pm.mana);
                });
                it("使用後情緒應該增加1", async () => {
                    assert.equal(1, pm.emo);
                });
            });
        });
    });
});