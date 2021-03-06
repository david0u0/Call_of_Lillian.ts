import { GamePhase, CardStat } from "../../enums";
import { Spell } from "../../cards";
import { ICharacter, TypeGaurd, buildConfig } from "../../interface";

let name = "修羅事變";
let description = "對手必須犧牲一個戰力大於或等於施術者的角色。若無法這麼做，則由你指定退場的角色。隨後，施放者必須退場。";

export default class S extends Spell {
    name = name;
    description = description;
    basic_mana_cost = 3;
    can_play_phase = [GamePhase.InAction];

    min_caster = 1;
    max_caster = 1;

    async onPlay() {
        await super.onPlay();

        let enemy = this.enemy_master.player;
        let caster = this.data.casters[0];

        let char_can_select = this.enemy_master.getAll(TypeGaurd.isCharacter, ch => {
            return this.my_master.getStrength(caster) <= this.enemy_master.getStrength(ch);
        });
        let e_char: ICharacter | null;
        if(char_can_select.length > 0) { // 由對手選
            e_char = await this.g_master.selecter.selectCardInteractive(enemy, [this, caster], buildConfig({
                guard: TypeGaurd.isCharacter,
                owner: enemy,
                must_have_value: true,
                check: char => {
                    return this.my_master.getStrength(caster) <= this.enemy_master.getStrength(char);
                }
            }));
        } else { // 由我選
            e_char = await this.g_master.selecter.selectCard(this.owner, [this, caster], buildConfig({
                guard: TypeGaurd.isCharacter,
                owner: enemy,
            }));
        }

        if(e_char) {
            await this.enemy_master.retireCard(e_char);
        }
        await this.my_master.retireCard(caster);
    }
}