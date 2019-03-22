import { ICard, ICharacter, IUpgrade, ISpell } from "./interface";
import { Player } from "./enums";
import { GameMaster } from "./game_master";

class UISelecter {
    constructor(private g_master: GameMaster) {

    }
}

class TestSelecter {
    constructor(private g_master: GameMaster) { }

    private to_return_index: number = -1; // 只是用來測試的，事先把東西塞進去，等等再吐出來
    public setToReturnIndex(n: number) {
        this.to_return_index = n;
    }

    launchSelectChar(player: Player, chars: ICharacter,
        checkCanSelect = (c: ICharacter) => true
    ): ICharacter|null {
        let list = this.g_master.getMyMaster(player).characters;
        let char = list[this.to_return_index];
        if(checkCanSelect(char)) {
            return char;
        } else {
            return null;
        }
    }
}

const Selecter = TestSelecter;

export default Selecter;