import * as assert from "assert";

import { Player, CardStat, BattleRole, CharStat } from "../enums";
import { Character, Upgrade } from "../cards";
import { GameMaster } from "../game_master";

import { checkBadOperationError, checkBadOperationErrorAsync } from "./check_bad_operation";
import { TestSelecter, genFunc } from "./mocking_tools";
import { ICharacter, IUpgrade } from "../interface";

let p = Player.Player1;
let selecter = new TestSelecter();
let gm = new GameMaster(selecter, genFunc);
let pm = gm.getMyMaster(p);
let enemy_master = gm.getEnemyMaster(p);

let simple_char = gm.genCardToHand(p, "見習魔女") as ICharacter;
let simple_char2 = gm.genCardToHand(p, "見習魔女") as ICharacter;
let cyber_char = gm.genCardToHand(p, "數據之海的水手") as ICharacter;
let waste_land_char = gm.genCardToHand(p, "終末之民") as ICharacter;
let ferry_bomb_upgrade = gm.genCardToHand(p, "精靈炸彈") as IUpgrade;
let ferry_bomb_upgrade2 = gm.genCardToHand(p, "精靈炸彈") as IUpgrade;
let simple_upgrade1 = gm.genCardToHand(p, "u_test0") as IUpgrade;
let simple_upgrade2 = gm.genCardToHand(p, "u_test0") as IUpgrade;
let simple_upgrade3 = gm.genCardToHand(p, "u_test0") as IUpgrade;
let enemy_upgrade1 = gm.genCardToHand(Player.Player2, "u_test0") as IUpgrade;
let simple_upgrade4 = gm.genCardToHand(p, "u_test0") as IUpgrade;
let ultimate_0_test_char = gm.genCardToHand(p, "c_test0") as ICharacter;

describe("測試最基礎的角色卡與升級卡的互動", () => {
    describe("測試各種錯誤", () => {
        it("升級卡未設置欲安裝的角色應該噴錯誤", async () => {
            await gm.t_master.addActionPoint(100);
            await checkBadOperationErrorAsync(async () => {
                await pm.playCard(simple_upgrade1);
            });
        });
        it("升級卡欲安裝的角色還沒出場應該噴錯誤", async () => {
            selecter.setSelectedSeqs(simple_char.seq);
            await checkBadOperationErrorAsync(async () => {
                await pm.playCard(simple_upgrade1);
            });
        });
    });
    describe("打出最基礎的角色卡", () => {
        before(async () => {
            await pm.addMana(1000);
            await enemy_master.addMana(1000);
            await pm.playCard(simple_char);
            await pm.playCard(cyber_char);
        });
        it("角色的戰力應該是0", () => {
            assert.equal(0, pm.getStrength(simple_char));
        });
        it("角色不可攻擊防守(由於戰力為0)", () => {
            assert.deepEqual({ can_attack: false, can_block: false, is_melee: true }, pm.getBattleRole(simple_char));
        });
        it("在這個角色身上安裝升級卡的成本應該是基礎成本", () => {
            assert.equal(pm.getManaCost(simple_upgrade1), 1);
        });
        it("一張角色重複打兩次應該噴錯誤", async () => {
            await checkBadOperationErrorAsync(async () => await pm.playCard(simple_char));
        });
        it("升級卡欲安裝的角色不在待命區應該噴錯誤", async () => {
            simple_char.char_status = CharStat.InArena;
            selecter.setSelectedSeqs(simple_char.seq);
            await checkBadOperationErrorAsync(async () => {
                await pm.playCard(simple_upgrade1);
            });
        });
        it("有特殊能力的角色可以在場中裝備升級卡", () => {
            cyber_char.char_status = CharStat.InArena;
            selecter.setSelectedSeqs(cyber_char.seq);
            assert.doesNotThrow(async () => {
                await pm.playCard(simple_upgrade4);
            });
        });
        it("但該角色還是不能違抗硬性規則，如：裝備敵人的卡", async () => {
            cyber_char.char_status = CharStat.InArena;
            selecter.setSelectedSeqs(cyber_char.seq);
            await checkBadOperationErrorAsync(async () => {
                await pm.playCard(enemy_upgrade1);
            });
        });
        describe("裝備兩張最基礎的升級卡", () => {
            before(async () => {
                simple_char.char_status = CharStat.StandBy;
                selecter.setSelectedSeqs(simple_char.seq);
                await pm.playCard(simple_upgrade1);
                selecter.setSelectedSeqs(simple_char.seq);
                await pm.playCard(simple_upgrade2);
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
                assert.deepEqual({
                    can_attack: true,
                    can_block: true,
                    is_melee: true
                }, pm.getBattleRole(simple_char));
            });
            it("一張裝備卡重複打兩次應該噴錯誤", async () => {
                await checkBadOperationErrorAsync(async () => await pm.playCard(simple_upgrade1));
            });
            describe("拔掉其中一張升級卡", () => {
                before(() => {
                    // TODO: 拔掉 simple_upgrade1
                    pm.retireCard(simple_upgrade1);
                });
                it("拔掉後，角色的戰力應該是1", () => {
                    assert.equal(1, pm.getStrength(simple_char));
                });
                it("一張裝備卡重複拔兩次應該噴錯誤", async () => {
                    await checkBadOperationErrorAsync(async () => {
                        await pm.retireCard(simple_upgrade1);
                    });
                });
            });
        });
    });
});

describe("角色能力是即使戰力0仍不會變為平民，升級卡會給予裝備者「狙擊」屬性", () => {
    before(async () => {
        await pm.playCard(waste_land_char);
    });
    describe("測試角色卡", () => {
        it("角色的戰力應該是0", () => {
            assert.equal(0, pm.getStrength(waste_land_char));
        });
        it("雖然戰力為0，仍應該擁有戰士屬性", () => {
            assert.deepEqual({ can_attack: true, can_block: true }, pm.getBattleRole(waste_land_char));
        });
        it("在這個角色身上安裝升級卡的成本應該是基礎成本", () => {
            selecter.setSelectedSeqs(waste_land_char.seq);
            assert.equal(pm.getManaCost(ferry_bomb_upgrade), 1);
        });
    });
    describe("加入升級卡", () => {
        before(async () => {
            selecter.setSelectedSeqs(waste_land_char.seq);
            await pm.playCard(ferry_bomb_upgrade);
        });
        it("裝備後，角色的戰力應該是2", () => {
            assert.equal(2, pm.getStrength(waste_land_char));
        });
        it("由於裝備的影響，角色的戰鬥職位變成「狙擊」", () => {
            assert.equal(false, pm.getBattleRole(waste_land_char).can_be_blocked);
        });
    });
});

describe("測試一張強得亂七八糟的角色卡", () => {
    describe("測試其基礎數值", () => {
        it("角色的魔力成本應該是1", () => {
            assert.equal(0, pm.getManaCost(ultimate_0_test_char));
        });
        it("角色的戰力應該是10", () => {
            assert.equal(10, pm.getStrength(ultimate_0_test_char));
        });
    });
    describe("測試進階的能力", () => {
        before(async () => {
            await pm.playCard(simple_char2);
            selecter.setSelectedSeqs(simple_char2.seq);
            await pm.playCard(simple_upgrade3);
            pm.addMana(-pm.mana);
        });
        it("敵方的魔力本來應為1000", () => {
            assert.equal(1000, enemy_master.mana);
        });
        it("我方見習魔女的戰力本來為1", () => {
            assert.equal(1, pm.getStrength(simple_char2));
        });
        it("由於魔力不夠，應該無法打出升級卡", () => {
            assert.equal(pm.checkBeforePlay(ferry_bomb_upgrade2), false);
        });
        describe("角色入場", () => {
            before(async () => {
                await pm.playCard(ultimate_0_test_char);
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
            it("即使魔力不夠，UI還是允許打出升級卡", () => {
                assert.equal(pm.checkBeforePlay(ferry_bomb_upgrade2), true);
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