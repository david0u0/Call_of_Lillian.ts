import { Player } from "./enums";
import { Constant } from "./general_rules";
import { GameMaster } from "./master/game_master";
import Dummy from "./real_card/arena/dummy_arena";
import BasicHospital from "./real_card/arena/M市立綜合醫院";

// TODO: 應該要把 Keeper 傳進來?

function genDummy(gm: GameMaster, owner: Player, pos: number) {
    return () => {
        let arena = new Dummy(-1, owner, gm, Constant.DUMMY_NAME);
        arena.data.position = pos;
        return arena;
    };
}
function genHospital(gm: GameMaster, owner: Player, pos: number) {
    return () => {
        let arena = new BasicHospital(-1, owner, gm, "M市立綜合醫院");
        arena.data.position = pos;
        return arena;
    };
}

interface IDeck {
    name: string,
    description?: string,
    list: { abs_name: string, count: number }[],
}

export default async function initiateGame(gm: GameMaster, deck1: IDeck | null, deck2: IDeck | null) {
    let decks = [deck1, deck2];
    for(let p of [Player.Player1, Player.Player2]) {
        let pm = gm.getMyMaster(p);
        await pm.addMana(Constant.INIT_MANA);
        let deck = decks[p];
        if(deck) {
            if(deck.list.length != Constant.DECK_COUNT) {
                // throw new BadOperationError("牌庫張數有誤！");
            }
            for(let pair of deck.list) {
                for(let i = 0; i < pair.count; i++) {
                    gm.genCardToDeck(p, pair.abs_name);
                }
            }
        } else {
            for(let i = 0; i < Constant.DECK_COUNT; i++) {
                gm.genCardToDeck(p);
            }
        }
        await gm.genCardToBoard(p, genDummy(gm, p, 0));
        await gm.genCardToBoard(p, genDummy(gm, p, 1));
        await gm.genCardToBoard(p, genHospital(gm, p, 2));
        await gm.genCardToBoard(p, genDummy(gm, p, 3));
        await gm.genCardToBoard(p, genDummy(gm, p, 4));

        await gm.genCardToBoard(p, "見習魔女");
        await gm.genCardToBoard(p, "見習魔女");

        for(let i = 0; i < Constant.INIT_HAND; i++) {
            await pm.draw();
        }
    }
    await gm.t_master.startBulding();
}