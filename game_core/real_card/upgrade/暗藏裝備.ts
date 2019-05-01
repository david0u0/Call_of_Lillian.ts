import { ICharacter, TypeGaurd } from "../../interface";
import { Upgrade } from "../../cards";
import { GamePhase } from "../../enums";
import { BadOperationError } from "../../errors";

let name = "暗藏裝備";

export default class U extends Upgrade {
    name = name;
    deck_count = 0;
    get description() {
        return `以一個瞬間行動裝備暗藏的升級卡（${this.getName()}）。`;
    };
    basic_mana_cost = 4;
    basic_strength = 1;

    data: {
        character_equipped: ICharacter|null,
        upgrade_seq: number
    } = {
        character_equipped: null,
        upgrade_seq: -1
    };
    prepare() {
        this.card_leave_chain.append(stat => {
            // TODO:
        });
    }

    private getName() {
        let card = this.getUpgrade();
        if(TypeGaurd.isKnown(card)) {
            return card.name;
        }
        return null;
    }
    private getUpgrade() {
        let card = this.g_master.card_table[this.data.upgrade_seq];
        if(card) {
            return card;
        } else {
            throw new BadOperationError("找不到裝備");
        }
    }

    get _abilities() {
        let name = this.getName();
        let description = name ? `啟動${name}` : "啟動";
        return [{
            description,
            instance: true,
            can_play_phase: [GamePhase.Any],
            canTrigger: () => true,
            func: async () => {
                let _card = await this.g_master.exposeCard(this.getUpgrade());
                if(TypeGaurd.isUpgrade(_card)) {
                    let card = _card;
                    this.g_master.genCardToBoard(this.owner, () => {
                        let upgrade = this.g_master.constructSameCard(card);
                        upgrade.data.character_equipped = this.data.character_equipped;
                        return upgrade;
                    });
                }
            }
        }];
    }
}