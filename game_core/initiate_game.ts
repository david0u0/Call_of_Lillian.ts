import { GameMaster } from "./game_master";
import { Player } from "./enums";
import { BadOperationError } from "./errors";
import { Constant } from "./general_rules";

const basic_deck = [
    "姆咪姆咪學園", "姆咪姆咪學園", "姆咪姆咪學園",
    "u_test0", "u_test0",
    "雨季的魔女．語霽", "雨季的魔女．語霽", "雨季的魔女．語霽",
    "迷糊工程師．八喵", "迷糊工程師．八喵", "迷糊工程師．八喵",
    "緊急醫療", "緊急醫療", "緊急醫療",
    "火力鎮壓", "火力鎮壓", "火力鎮壓",
    "大衛化", "大衛化", "大衛化",
    "彩虹橋下的酒館", "彩虹橋下的酒館",
    "義體維護廠", "義體維護廠", "戰地醫院", "戰地醫院"
];

// TODO: 應該要把 Keeper 傳進來?

export default async function initiateGame(gm: GameMaster, deck1: string[]|null, deck2: string[]|null) {
    let decks = [deck1, deck2];
    for(let p of [Player.Player1, Player.Player2]) {
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

        gm.genCharToBoard(p, "見習魔女");
        gm.genCharToBoard(p, "見習魔女");

        for(let i = 0; i < Constant.INIT_HAND; i++) {
            await pm.draw();
        }
    }
    await gm.t_master.startBulding();
}