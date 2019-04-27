import { Player } from "./enums";
import { Constant } from "./general_rules";
import { GameMaster } from "./master/game_master";

const basic_deck = [
    "姆咪姆咪學園", "姆咪姆咪學園", "姆咪姆咪學園",
    "工作狂小紅", "工作狂小紅", "工作狂小紅",
    "廢怯小跟班", "廢怯小跟班", "廢怯小跟班",
    "u_test0", "u_test0",
    "雨季的魔女．語霽", "雨季的魔女．語霽", "雨季的魔女．語霽",
    "迷糊工程師．八喵", "迷糊工程師．八喵", "迷糊工程師．八喵",
    "殲滅戰", "殲滅戰", "殲滅戰",
    "市立圖書館", "市立圖書館", "市立圖書館",
    "質因數分解魔法", "質因數分解魔法", "質因數分解魔法",
    "快樂魔藥", "快樂魔藥", "快樂魔藥",
    "九世軍魂", "九世軍魂", "九世軍魂",
    /*"緊急醫療", "緊急醫療", "緊急醫療",
    "代理戰爭", "代理戰爭", "代理戰爭",
    "大衛化", "大衛化", "大衛化",
    "彩虹橋下的酒館", "彩虹橋下的酒館",
    "義體維護廠", "義體維護廠", "戰地醫院", "戰地醫院",
    "傭兵學校", "傭兵學校", "傭兵學校",
    "勇氣之歌", "勇氣之歌", "勇氣之歌",
    "沒有魔法的世界", "沒有魔法的世界",
    "遊擊隊長小芳", "遊擊隊長小芳",
    "事件仲介所", "事件仲介所", "事件仲介所",*/
    "修羅事變", "修羅事變", "修羅事變",
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
        await gm.genArenaToBoard(p, 0, Constant.DUMMY_NAME);
        await gm.genArenaToBoard(p, 1, Constant.DUMMY_NAME);
        await gm.genArenaToBoard(p, 2, "M市立綜合醫院");
        await gm.genArenaToBoard(p, 3, Constant.DUMMY_NAME);
        await gm.genArenaToBoard(p, 4, Constant.DUMMY_NAME);

        await gm.genCharToBoard(p, "見習魔女");
        await gm.genCharToBoard(p, "見習魔女");

        for(let i = 0; i < Constant.INIT_HAND; i++) {
            await pm.draw();
        }
    }
    await gm.t_master.startBulding();
}