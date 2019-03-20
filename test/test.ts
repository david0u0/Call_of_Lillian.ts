import * as assert from "assert";

import { Player, CardStat, BattleRole } from "../enums";
import { Character, Upgrade } from "../cards"
import { GameMaster, BadOperationError } from "../game_master";
import { C2 } from "./real_card/character/c2";
import { C_Test0 } from "./real_card/character/c_test0";
import { C1 } from "./real_card/character/c1";
import { U1 } from "./real_card/upgrade/u1";
import { U_Test0 } from "./real_card/upgrade/u_test0";
let p = Player.Player1;
let gm = new GameMaster();
let pm = gm.getMyMaster(p);
let enemy_master = gm.getEnemyMaster(p);
gm.genCardToDeck(p, (seq, owner, _gm) => new C1(seq, owner, _gm));
let simple_char = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new C1(seq, owner, _gm));
let simple_char2 = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new C2(seq, owner, _gm));
let waste_land_char = pm.draw() as Character;
gm.genCardToDeck(p, (seq, owner, _gm) => new U1(seq, owner, _gm));
let ferry_bomb_upgrade = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade1 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade2 = pm.draw() as Upgrade;
gm.genCardToDeck(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let simple_upgrade3 = pm.draw() as Upgrade;
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
    it("如果試圖在打出角色前安裝升級，應該要噴錯誤", () => {
        checkBadOperationError(() => pm.playUpgrade(simple_upgrade1, simple_char));
    });
    describe("測試最基礎的角色卡", () => {
        before(() => {
            pm.playCharacter(simple_char);
        });
        it("角色的戰力應該是0", () => {
            assert.equal(0, pm.getStrength(simple_char));
        });
        it("角色的戰鬥特徵應該是平民(由於戰力為0)", () => {
            assert.equal(BattleRole.Civilian, pm.getBattleRole(simple_char));
        });
        it("在這個角色身上安裝升級卡的成本應該是基礎成本", () => {
            assert.equal(pm.getUpgradeManaCost(simple_upgrade1, simple_char), 1);
        });
        it("一張角色重複打兩次應該噴錯誤", () => {
            checkBadOperationError(() => pm.playCharacter(simple_char));
        });
        describe("裝備兩張最基礎的升級卡", () => {
            before(() => {
                pm.playUpgrade(simple_upgrade1, simple_char);
                pm.playUpgrade(simple_upgrade2, simple_char);
            });
            it("角色的升級欄應該有兩個東西在裡面", () => {
                assert.equal(2, simple_char.upgrade_list.length);
            });
            it("裝備後，角色的戰力應該是2", () => {
                assert.equal(2, pm.getStrength(simple_char));
            });
            it("角色的戰鬥特徵應該是戰士(由於戰力不再是0)", () => {
                assert.equal(BattleRole.Fighter, pm.getBattleRole(simple_char))
            });
            it("一張裝備卡重複打兩次應該噴錯誤", () => {
                checkBadOperationError(() => pm.playUpgrade(simple_upgrade1, simple_char));
            });
            describe("拔掉其中一張升級卡", () => {
                before(() => {
                    // TODO: 拔掉 simple_upgrade1
                });
                it("拔掉後，角色的戰力應該是1");
                it("一張裝備卡重複打兩次應該噴錯誤");
            });
        });
    });
});

describe("角色能力是即使戰力0仍不會變為平民，升級卡會給予裝備者「狙擊」屬性", () => {
    before(() => {
        pm.playCharacter(waste_land_char);
    });
    describe("測試角色卡", () => {
        it("角色的戰力應該是0", () => {
            assert.equal(0, pm.getStrength(waste_land_char));
        });
        it("雖然戰力為0，仍應該擁有戰士屬性", () => {
            assert.equal(BattleRole.Fighter, pm.getBattleRole(waste_land_char));
        });
        it("在這個角色身上安裝升級卡的成本應該是基礎成本", () => {
            assert.equal(pm.getUpgradeManaCost(ferry_bomb_upgrade, waste_land_char), 1);
        });
    });
    describe("加入升級卡", () => {
        before(() => {
            pm.playUpgrade(ferry_bomb_upgrade, waste_land_char);
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
            pm.playCharacter(simple_char2);
            pm.playUpgrade(simple_upgrade3, simple_char2);
        });
        it("敵方的魔力本來應為1000", () => {
            assert.equal(1000, enemy_master.mana);
        });
        it("我方另一個角色的戰力本來為1", () => {
            assert.equal(1, pm.getStrength(simple_char2));
        });
        describe("角色入場", () => {
            before(() => {
                pm.playCharacter(ultimate_0_test_char);
            });
            it("敵方的魔力應減10，變為990", () => {
                assert.equal(990, enemy_master.mana);
            });
            it("我方另一個角色戰力應加5，變為6", () => {
                assert.equal(6, pm.getStrength(simple_char2));
            });
            it("所有安裝在這個角色身上的裝備費用為零", () => {
                assert.equal(0, pm.getUpgradeManaCost(ferry_bomb_upgrade, ultimate_0_test_char));
            });
            it("每有一個角色退場，敵方情緒值+1");
            describe("當角色退場，我方角色的戰力應回復正常", () => {
            
            });
        });
    });
});