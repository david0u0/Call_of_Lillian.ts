import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Upgrade } from "../cards"
import { GameMaster } from "../game_master";
import { BadOperationError } from "../errors";

import { C2 } from "./real_card/character/c2";
import { C_Test0 } from "./real_card/character/c_test0";
import { C1 } from "./real_card/character/c1";
import { C4 } from "./real_card/character/c4";
import { U1 } from "./real_card/upgrade/u1";
import { U_Test0 } from "./real_card/upgrade/u_test0";

let p = Player.Player1;
let gm = new GameMaster();
let selecter = gm.selecter;
let pm = gm.getMyMaster(p);
let enemy_master = gm.getEnemyMaster(p);


gm.genCardToDeck(p, (seq, owner, _gm) => new C1(seq, owner, _gm));
let simple_char = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new C1(seq, owner, _gm));
let simple_char2 = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new C4(seq, owner, _gm));
let cyber_char = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new C2(seq, owner, _gm));
let waste_land_char = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new U1(seq, owner, _gm));
let ferry_bomb_upgrade = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U1(seq, owner, _gm));
let ferry_bomb_upgrade2 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade1 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade2 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade3 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade4 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new C_Test0(seq, owner, _gm));
let ultimate_0_test_char = pm.draw() as Character;

pm.setMana(1000);
enemy_master.setMana(1000);

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

describe("測試最基礎的角色卡與升級卡的互動", () => {
    describe("測試各種錯誤", () => {
        it("升級卡未設置欲安裝的角色應該噴錯誤", () => {
            checkBadOperationError(() => {
                pm.playCard(simple_upgrade1);
            });
        });
        it("升級卡欲安裝的角色還沒出場應該噴錯誤", () => {
            selecter.setSelectedSeqs(simple_char.seq);
            checkBadOperationError(() => {
                pm.playCard(simple_upgrade1);
            });
        });
    });
    describe("打出最基礎的角色卡", () => {
        before(() => {
            pm.playCard(simple_char);
            pm.playCard(cyber_char);
        });
        it("角色的戰力應該是0", () => {
            assert.equal(0, pm.getStrength(simple_char));
        });
        it("角色的戰鬥特徵應該是平民(由於戰力為0)", () => {
            assert.equal(BattleRole.Civilian, pm.getBattleRole(simple_char));
        });
        it("在這個角色身上安裝升級卡的成本應該是基礎成本", () => {
            assert.equal(pm.getManaCost(simple_upgrade1), 1);
        });
        it("一張角色重複打兩次應該噴錯誤", () => {
            checkBadOperationError(() => pm.playCard(simple_char));
        });
        it("升級卡欲安裝的角色不在待命區應該噴錯誤", () => {
            simple_char.char_status = CharStat.InArena;
            selecter.setSelectedSeqs(simple_char.seq);
            checkBadOperationError(() => {
                pm.playCard(simple_upgrade1);
            });
        });
        it("有特殊能力的角色可以在場中裝備升級卡", () => {
            cyber_char.char_status = CharStat.InArena;
            selecter.setSelectedSeqs(cyber_char.seq);
            assert.doesNotThrow(() => {
                pm.playCard(simple_upgrade4);
            });
        });
        describe("裝備兩張最基礎的升級卡", () => {
            before(() => {
                simple_char.char_status = CharStat.StandBy;
                selecter.setSelectedSeqs(simple_char.seq);
                pm.playCard(simple_upgrade1);
                selecter.setSelectedSeqs(simple_char.seq);
                pm.playCard(simple_upgrade2);
            });
            it("角色的升級欄應該有兩個東西在裡面", () => {
                assert.equal(2, simple_char.upgrade_list.length);
            });
            it("目前為止應該花了7點魔力，總魔力變為993", () => {
                assert.equal(993, pm.mana);
            });
            it("裝備後，角色的戰力應該是2", () => {
                assert.equal(2, pm.getStrength(simple_char));
            });
            it("角色的戰鬥特徵應該是戰士(由於戰力不再是0)", () => {
                assert.equal(BattleRole.Fighter, pm.getBattleRole(simple_char))
            });
            it("一張裝備卡重複打兩次應該噴錯誤", () => {
                checkBadOperationError(() => pm.playCard(simple_upgrade1));
            });
            describe("拔掉其中一張升級卡", () => {
                before(() => {
                    // TODO: 拔掉 simple_upgrade1
                });
                it("拔掉後，角色的戰力應該是1");
                it("一張裝備卡重複拔兩次應該噴錯誤");
            });
        });
    });
});

describe("角色能力是即使戰力0仍不會變為平民，升級卡會給予裝備者「狙擊」屬性", () => {
    before(() => {
        pm.playCard(waste_land_char);
    });
    describe("測試角色卡", () => {
        it("角色的戰力應該是0", () => {
            assert.equal(0, pm.getStrength(waste_land_char));
        });
        it("雖然戰力為0，仍應該擁有戰士屬性", () => {
            assert.equal(BattleRole.Fighter, pm.getBattleRole(waste_land_char));
        });
        it("在這個角色身上安裝升級卡的成本應該是基礎成本", () => {
            selecter.setSelectedSeqs(waste_land_char.seq);
            assert.equal(pm.getManaCost(ferry_bomb_upgrade), 1);
        });
    });
    describe("加入升級卡", () => {
        before(() => {
            selecter.setSelectedSeqs(waste_land_char.seq);
            pm.playCard(ferry_bomb_upgrade);
        });
        it("裝備後，角色的戰力應該是2", () => {
            assert.equal(2, pm.getStrength(waste_land_char));
        });
        it("由於裝備的影響，角色的戰鬥職位變成「狙擊」", () => {
            assert.equal(BattleRole.Sniper, pm.getBattleRole(waste_land_char));
        });
    });
});

describe("測試一張強得亂七八糟的角色卡", () => {
    describe("測試其基礎數值", () => {
        it("角色的魔力成本應該是1", () => {
            assert.equal(1, pm.getManaCost(ultimate_0_test_char));
        });
        it("角色的戰力應該是10", () => {
            assert.equal(10, pm.getStrength(ultimate_0_test_char));
        });
        it("角色的先天戰鬥職位就是狙擊", () => {
            assert.equal(BattleRole.Sniper, pm.getBattleRole(ultimate_0_test_char));
        });
    });
    describe("測試進階的能力", () => {
        before(() => {
            pm.playCard(simple_char2);
            selecter.setSelectedSeqs(simple_char2.seq);
            pm.playCard(simple_upgrade3);
        });
        it("敵方的魔力本來應為1000", () => {
            assert.equal(1000, enemy_master.mana);
        });
        it("我方見習魔女的戰力本來為1", () => {
            assert.equal(1, pm.getStrength(simple_char2));
        });
        describe("角色入場", () => {
            before(() => {
                pm.playCard(ultimate_0_test_char);
            });
            it("敵方的魔力應減10，變為990", () => {
                assert.equal(990, enemy_master.mana);
            });
            it("見習魔女的戰力應加5，變為6", () => {
                assert.equal(6, pm.getStrength(simple_char2));
            });
            it("某件升級的費用本來應為1", () => {
                assert.equal(1, pm.getManaCost(ferry_bomb_upgrade2));
            });
            it("所有安裝在這個角色身上的升級費用應為零", () => {
                selecter.setSelectedSeqs(ultimate_0_test_char.seq);
                ferry_bomb_upgrade2.initialize();
                assert.equal(0, pm.getManaCost(ferry_bomb_upgrade2));
            });
            it("每有一個角色退場，敵方情緒值+1");
            describe("當角色退場，我方角色的戰力應回復正常", () => {
                before(() => {
                    // pm.retireCard(ultimate_0_test_char);
                    pm.exileCard(ultimate_0_test_char);
                });
                it("見習魔女的戰力應該變回1", () => {
                    assert.equal(1, pm.getStrength(simple_char2));
                });
            });
        });
    });
});