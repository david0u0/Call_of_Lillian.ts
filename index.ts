import { GameMaster } from "./game_master";
import { C2 } from "./real_card/character/c2";
import { C1 } from "./real_card/character/c1";
import { U1 } from "./real_card/upgrade/u1";
import { U_Test0 } from "./real_card/upgrade/u_test0";
import { Player, CardStat, BattleRole } from "./enums";

let p = Player.Player1;
let gm = new GameMaster();
let pm = gm.getMyMaster(p);
gm.genCard(p, (seq, owner, _gm) => new C1(seq, owner, _gm));
let c1 = pm.draw() as C1;
gm.genCard(p, (seq, owner, _gm) => new C2(seq, owner, _gm));
let c2 = pm.draw() as C2;
gm.genCard(p, (seq, owner, _gm) => new U1(seq, owner, _gm));
let u1 = pm.draw() as U1;
gm.genCard(p, (seq, owner, _gm) => new U_Test0(seq, owner, _gm));
let u_test0 = pm.draw() as U_Test0;

pm.setMana(1000);

console.log(c2.name);
console.log(c2.description);
console.log(CardStat[c2.card_status])
console.log(pm.getStrength(c2));

pm.playCharacter(c2);
console.log(CardStat[c2.card_status])
console.log(BattleRole[pm.getBettleRole(c2)]); // Fighter
console.log(pm.getStrength(c2));

pm.playUpgrade(u1, c2);
console.log(pm.getStrength(c2));
console.log(BattleRole[pm.getBettleRole(c2)]); // Sniper

console.log(c1.name);
console.log(c1.description);
pm.playCharacter(c1);
console.log(BattleRole[pm.getBettleRole(c1)]); // Fighter

pm.playUpgrade(u_test0, c1);
console.log(pm.getStrength(c1));
console.log(BattleRole[pm.getBettleRole(c1)]); // Fighter