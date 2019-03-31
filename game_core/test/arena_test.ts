import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Arena } from "../cards";
import { GameMaster } from "../game_master";
import { BadOperationError } from "../errors";

import checkBadOperationError from "./check_bad_operation";
import Hospital from "./real_card/arena/M市立綜合醫院";
import Rainy from "./real_card/character/雨季的魔女．語霽";

let p1 = Player.Player1;
let p2 = Player.Player2;
let gm = new GameMaster();
let selecter = gm.selecter;
let pm = gm.getMyMaster(p1);
let enemy_master = gm.getEnemyMaster(p1);

pm.addMana(1000);
enemy_master.addMana(1000);

describe("測試最基礎的場所卡", () => {
    let my_h: Arena;
    let enemy_h: Arena;
    let rainy: Character;
    let rainy2: Character;
    let e_rainy3: Character;
    before(() => {
        let a_generater = (seq: number, owner: Player, gm: GameMaster) => {
            return new Hospital(seq, owner, gm);
        };
        gm.genArenaToBoard(p1, 0, a_generater);
        gm.genArenaToBoard(p1, 1, a_generater);
        my_h = gm.genArenaToBoard(p1, 2, a_generater) as Arena;
        gm.genArenaToBoard(p1, 3, a_generater);
        gm.genArenaToBoard(p1, 4, a_generater);
        gm.genArenaToBoard(p2, 0, a_generater);
        gm.genArenaToBoard(p2, 1, a_generater);
        enemy_h = gm.genArenaToBoard(p2, 2, a_generater) as Arena;
        gm.genArenaToBoard(p2, 3, a_generater);
        gm.genArenaToBoard(p2, 4, a_generater);
        let c_generater = (seq: number, owner: Player, gm: GameMaster) => {
            return new Rainy(seq, owner, gm);
        };
        rainy = gm.genCardToHand(p1, c_generater) as Character;
        rainy2 = gm.genCardToHand(p1, c_generater) as Character;
        e_rainy3 = gm.genCardToHand(p2, c_generater) as Character;
        pm.playCard(rainy);
        pm.playCard(rainy2);
        enemy_master.playCard(e_rainy3);
    });
    it("進入自己場所應該不用花費", () => {
        assert.equal(gm.getEnterCost(rainy, my_h), 0);
    });
    it("進入敵人的場所要多花1魔力", () => {
        assert.equal(gm.getEnterCost(rainy, enemy_h), 1);
    });
    describe("測試進入場所的功能", () => {
        it("選擇的場所如果不到一個應該要報錯", () => {
            checkBadOperationError(() => {
                gm.enterArena(rainy);
            });
        });
        describe("讓角色實際進入場所", () => {
            before(() => {
                selecter.setSelectedSeqs(my_h.seq);
                gm.enterArena(rainy);
            });
            it("在場所中的角色欲進入場所應該報錯", () => {
                checkBadOperationError(() => {
                    selecter.setSelectedSeqs(enemy_h.seq);
                    gm.enterArena(rainy);
                });
            });
            it("角色進入的場所應該是自己的醫院", () => {
                assert.equal(true, my_h.isEqual(rainy.arena_entered));
            });
            it("場所中應該洽好有一個角色", () => {
                assert.equal(my_h.char_list.length, 1);
                assert.equal(true, my_h.char_list[0].isEqual(rainy));
            });
            it("進入時超過場所容納上限應該報錯", () => {
                selecter.setSelectedSeqs(my_h.seq);
                gm.enterArena(e_rainy3);
                checkBadOperationError(() => {
                    selecter.setSelectedSeqs(my_h.seq);
                    gm.enterArena(rainy2);
                });
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
                it("使用後魔力應該變成993+2=995", () => {
                    gm.exploit(my_h, rainy);
                    assert.equal(995, pm.mana);
                });
            });
        });
    });
});