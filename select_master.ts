import { ICard, ICharacter, IUpgrade, ISpell } from "./interface";
import { Player } from "./enums";

const MODE = (() => {
    if(process.env.mode) {
        if(process.env.mode == "TEST") {
            return "TEST";
        } else {
            return "RELEASE";
        }
    } else {
        return "DEBUG";
    }
})();

class SelectMaster {
    /*static selectChar(player: Player, chars: ICharacter,
        checkCanSelect = (c: ICharacter) => true
    ): ICharacter {
        if (MODE == "TEST") {
        } else {
            throw "undef";
        }
    }*/

    launchSelect() {
        // TODO: 發動一個UI命令來選擇需要的卡牌

    }
    chain(s_master: SelectMaster) {

    }
}

export default SelectMaster;