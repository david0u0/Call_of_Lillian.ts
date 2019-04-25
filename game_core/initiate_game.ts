import { Player } from "./enums";
import { Constant } from "./general_rules";
import { GameMaster } from "./master/game_master";

// TODO: 應該要把 Keeper 傳進來?

export default async function initiateGame(gm: GameMaster, deck1: string[]|null, deck2: string[]|null) {
    let decks = [deck1, deck2];
    for(let p of [Player.Player1, Player.Player2]) {
        let pm = gm.getMyMaster(p);
        await pm.addMana(Constant.INIT_MANA);
        let deck = decks[p];
        if(deck) {
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