import { GamePhase, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { TypeGaurd, buildConfig } from "../../interface";

let name = "亞空間探測";
let description = "從牌庫中檢索一張場所卡。";

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 3;
    can_play_phase = [GamePhase.InAction];

    protected max_caster = 1;
    protected min_caster = 1;

    async onPlay() {
        await super.onPlay();
        let arena = await this.g_master.selecter.selectCardInteractive(this.owner, this, buildConfig({
            guard: TypeGaurd.isArena,
            stat: CardStat.Deck,
            owner: this.owner,
        }));
        if(arena) {
            let card_to_draw = await this.g_master.exposeCard(arena);
            await this.my_master.draw(card_to_draw);
        }
        await this.my_master.retireCard(this);
    }
}