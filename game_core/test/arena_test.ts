import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Arena } from "../cards"
import { GameMaster } from "../game_master";
import { BadOperationError } from "../errors";

import Hospital from "./real_card/arena/醫院";
import Rainy from "./real_card/character/雨季的魔女．語霽";

function checkBadOperationError(func: () => void) {
    let error_caught = true;
    try {
        func();
        error_caught = false;
    } catch (e) {
        if (!(e instanceof BadOperationError)) {
            assert.fail(`抓到不正確的錯誤：${e.message}`);
        }
    }
    if (!error_caught) {
        assert.fail("沒有抓到錯誤");
    }
}

let p1 = Player.Player1;
let p2 = Player.Player2;
let gm = new GameMaster();
let selecter = gm.selecter;
let pm = gm.getMyMaster(p1);
let enemy_master = gm.getEnemyMaster(p1);

pm.setMana(1000);
enemy_master.setMana(1000);

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
        my_h = gm.genArenaToBoard(p1, 2, a_generater);
        gm.genArenaToBoard(p1, 3, a_generater);
        gm.genArenaToBoard(p1, 4, a_generater);
        gm.genArenaToBoard(p2, 0, a_generater);
        gm.genArenaToBoard(p2, 1, a_generater);
        enemy_h = gm.genArenaToBoard(p2, 2, a_generater);
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
        pm.playCard(e_rainy3);
    });
    it("進入自己場所應該不用花費", () => {
        rainy.arena_entered = my_h;
        assert.equal(gm.getEnterCost(rainy), 0);
    });
    it("進入敵人的場所要多花1魔力", () => {
        rainy.arena_entered = enemy_h;
        gm.getEnterCost(rainy);
        assert.equal(gm.getEnterCost(rainy), 1);
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
            it("上一個操作應該會修改到角色記錄中的進入地點（因為報錯把復原過程打斷了）", () => {
                assert.equal(true, enemy_h.isEqual(rainy.arena_entered));
            });
            it("手動復原後應該就沒問題了", () => {
                rainy.recoverFields();
                assert.equal(true, my_h.isEqual(rainy.arena_entered));
            })
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
            it("由於角色能力，敵人應該承受了一點情緒傷害", () => {
                assert.equal(enemy_master.emo, 1);
                assert.equal(pm.emo, 0);
            });
        });
        describe("測試實際使用場所", () => {

        });
    });
});