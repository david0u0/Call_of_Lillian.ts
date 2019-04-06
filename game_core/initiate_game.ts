import { GameMaster } from "./game_master";
import { Player } from "./enums";
import { BadOperationError } from "./errors";
import { Constant } from "./general_rules";

const basic_deck = [
    "M市立綜合醫院", "M市立綜合醫院", "M市立綜合醫院",
    "u_test0", "u_test0", "u_test0",
    "雨季的魔女．語霽", "雨季的魔女．語霽", "雨季的魔女．語霽",
    "數據之海的水手", "數據之海的水手", "數據之海的水手",
    "終末之民", "終末之民", "終末之民",
    "緊急醫療", "緊急醫療", "緊急醫療",
];

// TODO: 應該要把 Keeper 傳進來?

export default async function initiateGame(gm: GameMaster, deck1: string[]|null, deck2: string[]|null) {
    let decks = [deck1, deck2];
    for(let p of [Player.Player1, Player.Player2]) {
        await gm.t_master.startTurn(p);
        let pm = gm.getMyMaster(p);
        await pm.addMana(Constant.INIT_MANA);
        let deck = decks[p];
        if(deck) {
            if(deck.length != Constant.DECK_COUNT) {
                // throw new BadOperationError("牌庫張數有誤！");
                deck = basic_deck;
            }
            for(let c_name of deck) {
                gm.genCardToDeck(p, c_name);
            }
        } else {
            for(let i = 0; i < Constant.DECK_COUNT; i++) {
                gm.genUnknownToDeck(p);
            }
        }
        gm.genArenaToBoard(p, 0, Constant.DUMMY_NAME);
        gm.genArenaToBoard(p, 1, Constant.DUMMY_NAME);
        gm.genArenaToBoard(p, 2, "M市立綜合醫院");
        gm.genArenaToBoard(p, 3, Constant.DUMMY_NAME);
        gm.genArenaToBoard(p, 4, Constant.DUMMY_NAME);

        let char = gm.genCardToHand(p, "見習魔女");
        await pm.playCard(char);
        char = gm.genCardToHand(p, "見習魔女");
        await pm.playCard(char);
        char = gm.genCardToHand(p, "見習魔女");
        await pm.playCard(char);

        for(let i = 0; i < Constant.INIT_HAND; i++) {
            await pm.draw();
        }
    }
    await gm.t_master.startBulding();
}