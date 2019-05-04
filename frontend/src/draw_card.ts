import * as Filters from "pixi-filters";
import * as PIXI from "pixi.js";

import { IKnownCard, ICard, TypeGaurd as TG, ICharacter, IUpgrade, TypeGaurd } from "../../game_core/interface";
import { my_loader } from "./card_loader";
import { GameMaster } from "../../game_core/master/game_master";
import { Player, CharStat, CardType, SeriesTxt } from "../../game_core/enums";
import { PlayerMaster } from "../../game_core/master/player_master";
import { ShowBigCard } from "./show_big_card";
import { getPlayerColor } from "./get_constant";
import FrontendSelecter, { SelectState } from "./frontend_selecter";

const H = 1000, W = 722;
function titleStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width / 15,
        fontWeight: "bold",
        fill: 0,
        fontFamily: "微軟正黑體",

        wordWrapWidth: width * 3 / 5
    });
}
function manaStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width / 8,
        fill: 0,
        fontFamily: "微軟正黑體",
    });
}
function descrStyle(width: number) {
    return new PIXI.TextStyle({
        fontSize: width / 18,
        fill: 0,
        fontFamily: "微軟正黑體",
        wordWrap: true,
        breakWords: true,
        wordWrapWidth: width * 13 / 16
    });
}

function formatCardInfoStr(card: IKnownCard) {
    let type = (() => {
        switch(card.card_type) {
            case CardType.Arena:
                return "場所";
            case CardType.Character:
                return "角色";
            case CardType.Upgrade:
                return "升級";
            case CardType.Spell:
                return "咒語";
            case CardType.Event:
                if(TG.isEvent(card) && card.is_ending) {
                    return "結局";
                } else {
                    return "事件";
                }
            default:
                throw "未知的卡牌";
        }
    })();
    let infos = card.series.map(n => SeriesTxt[n]);
    if(card.instance && !TG.isUpgrade(card)) {
        infos.push("瞬間");
    }
    return `${type}${infos.length > 0 ? "-" : ""}${infos.join("．")}`;
}

export function getCardSize(width: number, height: number, landscape = false) {
    if(landscape) {
        let ratio = Math.min(width / H, height / W);
        return { width: ratio * H, height: ratio * W };
    } else {
        let ratio = Math.min(width / W, height / H);
        return { width: ratio * W, height: ratio * H };
    }
}

export function drawCardFace(card: ICard, width: number, height: number, landscape = false) {
    let img: PIXI.Sprite;
    if(TG.isKnown(card)) {
        if(card.abs_name in my_loader.resources) {
            img = new PIXI.Sprite(my_loader.resources[card.abs_name].texture);
        } else {
            throw `${card.abs_name}：沒有載入就想畫卡面`;
        }
    } else {
        img = new PIXI.Sprite(PIXI.loader.resources["card_back"].texture);
    }
    let res = getCardSize(width, height, landscape);
    let og_w = img.width;
    let og_h = img.height;
    img.scale.set(res.width / og_w, res.height / og_h);
    return img;
}
export function drawAbilityIcon(gm: GameMaster, selecter: FrontendSelecter,
    card: IKnownCard, size: number
) {
    let icon = new PIXI.Sprite(PIXI.loader.resources["ability"].texture);
    icon.height = icon.width = size;
    icon.anchor.set(0.5, 0.5);
    icon.interactive = true;
    icon.cursor = "pointer";
    icon.on("click", async evt => {
        if(selecter.selecting != SelectState.Card) {
            if(gm.t_master.cur_player == card.owner) {
                evt.stopPropagation();
                let a_index = 0;
                if(card.abilities.length > 1) {
                    let txt = card.abilities.map(a => a.description);
                    a_index = await gm.selecter.selectText(card.owner, card, txt);
                }
                await gm.getMyMaster(card).triggerAbility(card, a_index, true);
            }
        }
    });
    let update = () => {
        if(card.abilities.length != 0) {
            icon.visible = true;
        } else {
            icon.visible = false;
        }
    };
    update();
    gm.acf.setAfterEffect(update, () => icon != null);
    let destroy = () => {
        icon.destroy();
        icon = null;
    };
    return { view: icon, destroy };
}
export function drawUpgradeCount(gm: GameMaster, card: ICharacter, size: number) {
    let view = new PIXI.Container();
    let img = new PIXI.Sprite(PIXI.loader.resources["upgrade_pop"].texture);
    img.height = img.width = size;
    img.anchor.set(0.5, 0.5);
    let txt = new PIXI.Text("", new PIXI.TextStyle({
        fontSize: size*0.6
    }));
    txt.anchor.set(0.5, 0.5);
    let updateTxt = () => {
        if(card.upgrade_list.length > 0) {
            txt.text = card.upgrade_list.length.toString();
            view.visible = true;
        } else {
            view.visible = false;
        }
    };
    gm.acf.setAfterEffect(updateTxt, () => view != null);
    updateTxt();
    view.addChild(img);
    view.addChild(txt);
    let destroy = () => {
        view = null;
        view.destroy();
    };
    return { view, destroy };
}
export function drawStrength(gm: GameMaster, card: ICharacter | IUpgrade, s_width: number, need_upate=false) {
    let pm = gm.getMyMaster(card);
    let s_height = s_width * 0.4;
    let view = new PIXI.Container();

    let s_area = new PIXI.Graphics();
    s_area.lineStyle(2, getPlayerColor(pm.player, true));
    s_area.beginFill(getPlayerColor(pm.player, false), 2);
    s_area.drawRoundedRect(0, 0, s_width, s_height, s_height/2);
    //s_area.drawEllipse(s_width/2, s_height/2, s_width/2, s_height/2);
    s_area.endFill();
    view.addChild(s_area);

    let s_txt = new PIXI.Text("", new PIXI.TextStyle({
        fontSize: s_height * 0.7,
    }));
    s_txt.dirty = true;
    s_txt.anchor.set(0.5, 0.5);
    s_txt.position.set(s_width / 2, s_height / 2);
    view.addChild(s_txt);
    let updateStr = () => {
        let str = pm.getStrength(card);
        if(str != card.basic_strength) {
            s_txt.style.fill = 0x0f70d2;
        } else {
            s_txt.style.fill = 0;
        }
        s_txt.text = str.toString();
    };
    updateStr();
    // 在任何牌被打出時更新戰力
    let destroy: () => void = null;
    if(need_upate) {
        gm.acf.setAfterEffect(updateStr, () => view != null);
        destroy = () => {
            view.destroy();
            view = null;
        };
    }

    return { view, destroy };
}

export function drawCard(gm: GameMaster, card: ICard, width: number, height: number, isbig = false) {
    let img: PIXI.Sprite;
    let container = new PIXI.Container();
    if(!TG.isKnown(card)) {
        img = drawCardFace(card, height, width);
        container.addChild(img);
    } else {
        if(TG.isArena(card) || TG.isEvent(card)) {
            img = drawCardFace(card, height, width, true);
            width = img.height;
            height = img.width;
            img.rotation = Math.PI / 2;
            img.x = width;
        } else {
            img = drawCardFace(card, width, height);
            ({ width, height } = img);
        }
        container.addChild(img);

        let title_rec = new PIXI.Graphics();
        title_rec.lineStyle(1, 0);
        title_rec.beginFill(0xffffff, 1);
        title_rec.drawRoundedRect(width / 15, width / 12, width * 13 / 15, width / 10, 5);
        title_rec.endFill();
        let name_txt = new PIXI.Text(truncateName(card.name, title_rec.width), titleStyle(width));
        name_txt.position.set(width / 15 * 1.5, width / 12);
        container.addChild(title_rec);
        container.addChild(name_txt);
        let mana_txt = new PIXI.Text(card.basic_mana_cost.toString(), manaStyle(width));
        let mana_pop_img = new PIXI.Sprite(PIXI.loader.resources["mana_pop"].texture);
        mana_pop_img.scale.set(width / 7 / mana_pop_img.width);
        mana_pop_img.position.set(width / 8, -width / 10);
        mana_txt.anchor.set(-0.5, 0);
        mana_txt.position.set(width / 8, -width / 10);
        mana_txt.alpha = 0.8;
        container.addChild(mana_pop_img);
        container.addChild(mana_txt);

        if(isbig) {
            let description_rec = new PIXI.Graphics();
            description_rec.lineStyle(1, 0);
            description_rec.beginFill(0xffffff, 1);
            description_rec.drawRoundedRect(width / 15, height * 3 / 5, width * 13 / 15, height * 11 / 30, 5);
            description_rec.endFill();
            let description_txt = new PIXI.Text(card.description, descrStyle(width));
            description_txt.position.set(width / 15 * 1.3, height * 3 / 5);
            container.addChild(description_rec);
            container.addChild(description_txt);

            let info_rec = new PIXI.Graphics();
            info_rec.lineStyle(1, 0);
            info_rec.beginFill(0xffffff, 1);
            info_rec.drawRoundedRect(width / 15, height / 2, width * 13 / 15, width / 10, 5);
            info_rec.endFill();
            let info_txt = new PIXI.Text(formatCardInfoStr(card), titleStyle(width));
            info_txt.position.set(width / 15 * 1.3, height / 2);
            container.addChild(info_rec);
            container.addChild(info_txt);
            
        }

        if(TG.isCharacter(card) || TG.isUpgrade(card)) {
            if(isbig) {
                let s_area = drawStrength(gm, card, width * 0.4);
                container.addChild(s_area.view);
                s_area.view.position.set(width * 0.3, height - s_area.view.height / 2);
            }
        } else if(TG.isEvent(card)) {
            let goal_txt = new PIXI.Text(card.goal_progress_count.toString(), manaStyle(width));
            let goal_pop_img = new PIXI.Sprite(PIXI.loader.resources["goal_pop"].texture);
            goal_pop_img.scale.set(width / 7 / goal_pop_img.width);
            goal_pop_img.position.set(width / 8 * 2, -width / 10);
            goal_txt.anchor.set(-0.5, 0);
            goal_txt.position.set(width / 8 * 2, -width / 10);
            goal_txt.alpha = 0.8;
            container.addChild(goal_pop_img);
            container.addChild(goal_txt);
            let countdown_txt = new PIXI.Text(card.init_time_count.toString(), manaStyle(width));
            let countdown_pop_img = new PIXI.Sprite(PIXI.loader.resources["countdown_pop"].texture);
            countdown_pop_img.scale.set(width / 7 / countdown_pop_img.width);
            countdown_pop_img.position.set(width / 8 * 3, -width / 10);
            countdown_txt.anchor.set(-0.5, 0);
            countdown_txt.position.set(width / 8 * 3, -width / 10);
            countdown_txt.alpha = 0.8;
            container.addChild(countdown_pop_img);
            container.addChild(countdown_txt);
            let score_txt = new PIXI.Text(card.score.toString(), manaStyle(width));
            let score_pop_img = new PIXI.Sprite(PIXI.loader.resources["score_pop"].texture);
            score_pop_img.scale.set(width / 7 / score_pop_img.width);
            score_pop_img.position.set(width / 8 * 4, -width / 10);
            score_txt.anchor.set(-0.5, 0);
            score_txt.position.set(width / 8 * 4, -width / 10);
            score_txt.alpha = 0.8;
            container.addChild(score_pop_img);
            container.addChild(score_txt);
        }
    }

    container.pivot.set(0, -width / 10);
    return container;
}

function truncateName(name: string, width: number) {
    return name.slice(0, width / 14);
}

export class CharUI {
    public readonly view = new PIXI.Container();

    private readonly img: PIXI.Sprite;
    private destroy_big: () => void = null;
    private filter: Filters.GlowFilter;

    private upgrade_area: { view: PIXI.Container, destroy: () => void };
    private s_area: { view: PIXI.Container, destroy: () => void };
    private ability_icon: { view: PIXI.Container, destroy: () => void };
    private active = true;

    public static create(char: ICharacter, width: number, height: number,
        gm: GameMaster, selecter: FrontendSelecter,
        ticker: PIXI.ticker.Ticker, showBigCard: ShowBigCard
    ): Promise<CharUI> {
        return new Promise<CharUI>(resolve => {
            my_loader.add(char).load(() => {
                resolve(new CharUI(char, width, height, gm, selecter, ticker, showBigCard));
            });
        });
    }
    private constructor(public readonly char: ICharacter,
        private width: number, private height: number,
        private gm: GameMaster, private selecter: FrontendSelecter,
        private ticker: PIXI.ticker.Ticker, showBigCard: ShowBigCard
    ) {
        let img = this.img = new PIXI.Sprite(my_loader.resources[char.abs_name].texture);
        let og_w = img.width;
        let og_h = img.height;
        img.scale.set(width / og_w, height / og_h);
        this.view.addChild(img);
        // 入場效果
        img.alpha = 0;
        let fade_in = () => {
            if(img.alpha < 1) {
                img.alpha += 0.1;
            } else {
                img.alpha = 1;
                this.ticker.remove(fade_in);
            }
        };
        this.ticker.add(fade_in);
        // 大圖
        img.interactive = true;
        img.cursor = "pointer";
        img.on("mouseover", () => {
            this.destroy_big = showBigCard(
                img.worldTransform.tx + img.width / 2, img.worldTransform.ty + img.height / 2,
                char);
        });
        img.on("mouseout", () => {
            if(this.destroy_big) {
                this.destroy_big();
                this.destroy_big = null;
            }
        });
        // 升級
        this.upgrade_area = drawUpgradeCount(gm, char, img.height / 3);
        this.upgrade_area.view.position.set(width, height / 3);
        // 點擊處理
        this.img.on("click", evt => {
            for(let f of this._onclick_func) {
                let res = f(evt);
                if(typeof(res) == "boolean") {
                    if(res) { // 打斷
                        return;
                    }
                }
            }
        });
        // 戰力
        this.s_area = drawStrength(gm, char, width * 0.6, true);
        this.s_area.view.position.set(width * 0.2, height - this.s_area.view.height / 2);
        // 疲勞
        let tired_mask = new PIXI.Graphics();
        tired_mask.beginFill(0);
        tired_mask.drawRect(0, 0, width, height);
        tired_mask.endFill();
        tired_mask.alpha = char.is_tired ? 0.5 : 0;
        let fade_in_tired = () => {
            if(tired_mask.alpha < 0.5) {
                tired_mask.alpha += 0.1;
            } else {
                tired_mask.alpha = 0.5;
                this.ticker.remove(fade_in_tired);
            }
        };
        let fade_out_tired = () => {
            if(tired_mask.alpha > 0) {
                tired_mask.alpha -= 0.1;
            } else {
                tired_mask.alpha = 0;
                this.ticker.remove(fade_out_tired);
            }
        };
        char.change_char_tired_chain.appendDefault(is_tired => {
            this.ticker.remove(fade_in_tired);
            this.ticker.remove(fade_out_tired);
            if(is_tired) {
                this.ticker.add(fade_in_tired);
            } else {
                this.ticker.add(fade_out_tired);
            }
        });
        this.view.addChild(tired_mask);
        // 角色行動或能力
        this.ability_icon = drawAbilityIcon(gm, selecter, char, img.width / 3);
        this.ability_icon.view.x = img.width;

        this.view.addChild(this.upgrade_area.view);
        this.view.addChild(this.s_area.view);
        this.view.addChild(this.ability_icon.view);
        this.filter = new Filters.GlowFilter(20, 1, 2, getPlayerColor(char.owner, true), 0.5);
        this.view.filters = [this.filter];
        this.filter.enabled = false;

        gm.getMyMaster(char).set_to_board_chain.appendDefault(c => {
            if(TG.isUpgrade(c) && char.isEqual(c.data.character_equipped) && this.active) {
                this.registerUpgrade(c);
            }
        });
    }
    private _high_count = 0;
    highlight(high=true, force=false) {
        if(high) {
            this._high_count++;
        } else if(this._high_count > 0) {
            if(force) {
                this._high_count = 0;
            } else {
                this._high_count--;
            }
        }
        this.filter.enabled = (this._high_count > 0);
    }
    register() {
        this.selecter.registerCardStartSelect(this.char, () => {
            this.highlight();
            return {
                view: this.view,
                cleanup: () => this.highlight(false)
            };
        });
        for(let u of this.char.upgrade_list) {
            this.registerUpgrade(u);
        }
    }
    // 幫升級卡向選擇器註冊
    private registerUpgrade(u: IUpgrade) {
        this.selecter.registerCardStartSelect(u, () => {
            let upgrade_ui = drawCard(this.gm, u, this.view.width, this.view.height);
            upgrade_ui.pivot.set(0, upgrade_ui.height);
            upgrade_ui.position.set(this.width/3, this.view.height);
            upgrade_ui.scale.set(0.2);
            this.view.addChild(upgrade_ui);
            this.img.alpha = 0.6;
            this.filter.enabled = true;
            return new Promise(resolve => {
                let popup = () => {
                    let scale = upgrade_ui.scale.x;
                    if(scale < 1.2) {
                        upgrade_ui.scale.set(scale + 0.07);
                    } else {
                        this.ticker.remove(popup);
                        resolve({
                            view: this.view,
                            cleanup: () => {
                                upgrade_ui.destroy();
                                this.img.alpha = 1;
                                this.filter.enabled = false;
                            }
                        });
                    }
                };
                this.ticker.add(popup);
            });
        });
    }
    private _onclick_func = new Array<(evt: PIXI.interaction.InteractionEvent) => boolean|void>();
    setOnclick(func: (evt: PIXI.interaction.InteractionEvent) => boolean|void) {
        this._onclick_func = [...this._onclick_func, func];
    }
    hide() {
        if(this.destroy_big) {
            this.destroy_big();
        }
        this.view.visible = false;
        this.active = false;
    }
    show() {
        this.view.visible = true;
        this.active = true;
    }
    destroy() {
        if(this.destroy_big) {
            this.destroy_big();
        }
        this.view.destroy();
        this.upgrade_area.destroy;
        this.s_area.destroy;
        this.active = false;
    }
}