import { Player } from "./enums";
import { Constant } from "./general_rules";
import { GameMaster } from "./master/game_master";
import Dummy from "./real_card/arena/dummy_arena";
import BasicHospital from "./real_card/arena/M市立綜合醫院";
import EventArena from "./real_card/arena/事件仲介所";
import ArmySchool from "./real_card/arena/傭兵學校";
import Pub from "./real_card/arena/彩虹橋下的酒館";
import { IArena } from "./interface";

// TODO: 應該要把 Keeper 傳進來?

function genArena(C: new (seq: number, owner: Player, gm: GameMaster, abs_name: string) => IArena,
    gm: GameMaster, owner: Player, pos: number, abs_name: string
) {
    return () => {
        let arena = new C(-1, owner, gm, abs_name);
        arena.data.position = pos;
        return arena;
    };
}

interface IDeck {
    name: string,
    description?: string,
    list: { abs_name: string, count: number }[],
}

type PlayerInfo = {
    // TODO: Keeper Card
    player: Player,
    deck: IDeck | number;
};

export default async function initiateGame(gm: GameMaster,
    info1: PlayerInfo, info2: PlayerInfo, mode: "DEV" | "RELEASE" | "TEST"
) {
    let info_table: { [player: number]: PlayerInfo } = { };
    info_table[info1.player] = info1;
    info_table[info2.player] = info2;

    for(let p of [Player.Player1, Player.Player2]) {
        let pm = gm.getMyMaster(p);
        await pm.addMana(Constant.INIT_MANA);
        let { deck } = info_table[p];
        if(typeof deck == "object") {
            if(deck.list.length != Constant.DECK_COUNT) {
                // throw new BadOperationError("牌庫張數有誤！");
            }
            for(let pair of deck.list) {
                for(let i = 0; i < pair.count; i++) {
                    gm.genCardToDeck(p, pair.abs_name);
                }
            }
        } else {
            for(let i = 0; i < deck; i++) {
                gm.genCardToDeck(p);
            }
        }
        await gm.genCardToBoard(p, genArena(Dummy, gm, p, 0, Constant.DUMMY_NAME));
        await gm.genCardToBoard(p, genArena(Dummy, gm, p, 1, Constant.DUMMY_NAME));
        await gm.genCardToBoard(p, genArena(BasicHospital, gm, p, 2, "M市立綜合醫院"));
        await gm.genCardToBoard(p, genArena(Dummy, gm, p, 3, Constant.DUMMY_NAME));
        await gm.genCardToBoard(p, genArena(Dummy, gm, p, 4, Constant.DUMMY_NAME));

        await gm.genCardToBoard(p, "見習魔女");
        await gm.genCardToBoard(p, "見習魔女");

        for(let i = 0; i < Constant.INIT_HAND; i++) {
            await pm.draw();
        }
        
        if(mode != "RELEASE") {
            // 給一堆資源方便測試
            await pm.addMana(50);
            await pm.addEmo(50);
            await gm.genCardToBoard(p, "游擊隊員");
            await gm.genCardToBoard(p, "游擊隊員");
            await gm.genCardToBoard(p, "游擊隊員");
            await gm.genCardToBoard(p, genArena(ArmySchool, gm, p, 1, "傭兵學校"));
            await gm.genCardToBoard(p, genArena(EventArena, gm, p, 3, "事件仲介所"));
            await gm.genCardToBoard(p, genArena(Pub, gm, p, 4, "彩虹橋下的酒館"));
        }
    }
    await gm.t_master.startBulding();
}