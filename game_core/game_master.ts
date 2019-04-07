// NOTE: 所有的鏈在觸發時，先觸發卡片事件（特例），再觸發世界事件（通則）。
// 因此，如果有什麼東西需要把後面的規則覆蓋掉，應該要寫在特例中。

import { Player, CardStat, BattleRole, CharStat, GamePhase } from "./enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG, ISelecter, UnknownCard } from "./interface";
import { ActionChain, GetterChain } from "./hook";
import { throwIfIsBackend, BadOperationError } from "./errors";
import { SoftRule as SR, HardRule as HR, Constant as C, Constant } from "./general_rules";
import { TimeMaster } from "./time_master";

class PlayerMaster {
    public readonly card_table: { [index: number]: ICard } = {};

    private _mana = 0;
    private _emo = 0;
    // private _gravyard = new Array<IKnownCard>();
    private _characters = new Array<ICharacter>();
    private _arenas = new Array<IArena>(C.MAX_ARENA);
    private _events_ongoing = new Array<IEvent>();
    private _events_finished = new Array<IEvent>();
    public get mana() { return this._mana; };
    public get emo() { return this._emo; };
    public get deck() { 
        let deck = new Array<ICard>();
        for(let seq in this.card_table) {
            let c = this.card_table[seq];
            if(c.card_status == CardStat.Deck) {
                deck.push(c);
            }
        }
        return deck;
    }
    public get hand() {
        let hand = new Array<ICard>();
        for(let seq in this.card_table) {
            let c = this.card_table[seq];
            if(c.card_status == CardStat.Hand) {
                hand.push(c);
            }
        }
        return hand;
    }
    public get characters() { return [...this._characters]; };
    public get arenas() { return [...this._arenas]; };
    public get events_ongoing() { return [...this._events_ongoing]; };
    public get events_finished() { return [...this._events_finished]; };

    // TODO: 應該要有一個參數 getCurPhase，用來得知現在是哪個遊戲階段
    constructor(public readonly player: Player, private readonly selecter: ISelecter,
        private t_master: TimeMaster
    ) {
        let soft_rules = new SR(() => t_master.cur_phase);
        soft_rules.checkPlay(this.card_play_chain);
        soft_rules.onGetBattleRole(this.get_battle_role_chain, this.getStrength.bind(this));
        soft_rules.onFail(this.fail_chain, () => this.mana,
            this.addMana.bind(this), this.addEmo.bind(this));
        soft_rules.checkPush(this.push_chain);
        soft_rules.onFinish(this.finish_chain, this.retireCard.bind(this));
        soft_rules.onGetManaCost(this.get_mana_cost_chain, () => this.arenas);
        soft_rules.onGetEnterCost(this.get_enter_cost_chain);
        soft_rules.checkEnter(this.enter_chain);
        soft_rules.onEnter(this.enter_chain, (mana) => {
            this.addMana(mana);
        });
        soft_rules.checkExploit(this.exploit_chain);

        t_master.start_building_chain.append(() => {
            // 所有角色解除疲勞並離開場所
            for(let char of this.characters) {
                this.changeCharTired(char, false);
                if(char.arena_entered) {
                    this.exitArena(char);
                }
            }
        });
    }
    
    /** 
     * 做打卡前的判斷，主要用來檢查前端界面
     * 舉例而言，有張角色的功能是施放咒語可降費
     * 那麼她應該修改全域的的 check_before_play_chain 使這些咒語不會被介面擋下來，可以進入到選擇施放者的步驟。
     * （然而如果最終不是由該角色施放，還是會被 card_play_chain 擋下來）
     */
    public check_before_play_chain = new GetterChain<boolean, IKnownCard>();

    public change_char_tired_chain = new ActionChain<{is_tired: boolean, char: ICharacter}>();

    public card_play_chain = new ActionChain<IKnownCard>();
    public card_retire_chain = new ActionChain<IKnownCard>();

    public set_mana_chain = new ActionChain<{ mana: number, caller: IKnownCard[] }>();
    public set_emo_chain = new ActionChain<{ emo: number, caller: IKnownCard[] }>();

    public ability_chain = new ActionChain<{ card: IKnownCard, a_index: number }>();

    public fail_chain = new ActionChain<IEvent>();
    public get_push_cost_chain = new GetterChain<number, { char: ICharacter|null, event: IEvent }>();
    public push_chain = new ActionChain<{ char: ICharacter|null, event: IEvent }>();
    public finish_chain = new ActionChain<{ char: ICharacter|null, event: IEvent }>();

    public get_strength_chain
        = new GetterChain<number, ICharacter>();
    public get_inconflict_strength_chain
        = new GetterChain<number, { me: ICharacter, enemy: ICharacter }>();
    public get_mana_cost_chain
        = new GetterChain<number, IKnownCard>();
    public get_battle_role_chain
        = new GetterChain<BattleRole, ICharacter>();

    public draw_card_chain = new ActionChain<ICard>();

    addCard(card: ICard) {
        // TODO: 加上事件鏈?
        if(card.seq in this.card_table) {
            throw new BadOperationError("嘗試將已經有的卡牌塞給使用者");
        } else {
            this.card_table[card.seq] = card;
        }
    }

    async draw(seq?: number) {
        let card: ICard|null = null;
        if(seq) {
            card = this.card_table[seq];
            if(!card || card.card_status != CardStat.Deck) {
                throw new BadOperationError("欲檢索的卡牌不在牌庫中！");
            }
        } else {
            let deck = this.deck;
            let n = Math.floor(deck.length * Math.random());
            card = deck[n];
        }
        if(card) {
            let _card = card;
            await this.draw_card_chain.trigger(card, () => {
                _card.card_status = CardStat.Hand;
            });
        }
        return card;
    }

    async addEmo(n: number, caller: IKnownCard[] = []) {
        let new_emo = Math.max(0, this.emo + n);
        await this.set_emo_chain.trigger({ emo: new_emo, caller }, () => {
            this._emo = new_emo;
        });
    }

    getManaCost(card: IKnownCard) {
        return card.get_mana_cost_chain.chain(this.get_mana_cost_chain, card)
        .trigger(card.basic_mana_cost, null);
    }

    async addMana(n: number, caller: IKnownCard[] = []) {
        let new_mana = Math.max(0, this.mana + n);
        await this.set_mana_chain.trigger({ mana: new_mana, caller }, () => {
            this._mana = new_mana;
        });
    }

    getScore() {
        return this.events_finished.reduce((sum, e) => sum + e.score, 0);
    }

    getStrength(char: ICharacter) {
        let strength = char.basic_strength;
        for(let u of char.upgrade_list) {
            strength += u.basic_strength;
        }
        return char.get_strength_chain.chain(this.get_strength_chain, char)
        .trigger(strength, null);
    }

    getBattleRole(char: ICharacter) {
        return char.get_battle_role_chain.chain(this.get_battle_role_chain, char)
        .trigger(char.basic_battle_role, null);
    }
    checkBeforePlay(card: IKnownCard) {
        if(this.t_master.cur_player != this.player) {
            return false;
        }
        let can_play = this.mana > this.getManaCost(card);
        return card.check_before_play_chain.chain(this.check_before_play_chain, card)
        .trigger(can_play, null);
    }
    checkCanPlay(card: IKnownCard) {
        if(HR.checkPlay(this.player, card, this.mana, this.getManaCost(card))) {
            return card.card_play_chain.chain(this.card_play_chain, card)
            .checkCanTrigger(null);
        } else {
            return false;
        }
    }
    async playCard(card: IKnownCard, by_keeper=false) {
        // 檢查
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合出牌？", card);
        }
        card.rememberFields();
        if(!(await card.initialize()) || !this.checkCanPlay(card)) {
            card.recoverFields();
            return false;
        }
        // 支付代價
        await this.addMana(-this.getManaCost(card));
        if(!card.instance) {
            if(this.t_master.cur_phase == GamePhase.Building
                || this.t_master.cur_phase == GamePhase.InAction
            ) {
                await this.t_master.addActionPoint(-1);
            }
        }
        // 實際行動
        return await card.card_play_chain.chain(this.card_play_chain, card)
        .triggerByKeeper(by_keeper, null, async () => {
            card.card_status = CardStat.Onboard;
            this.dangerouslyPlay(card);
            await Promise.resolve(card.onPlay());
            await Promise.resolve(card.setupAliveeEffect());
        }, () => {
            // NOTE: card 變回手牌而不是進退場區或其它鬼地方。
            // 通常 intercept_effect 為真的狀況早就在觸發鏈中報錯了，我也不曉得怎麼會走到這裡 @@
            card.recoverFields();
        });
    }
    /** 會跳過大多數的檢查、代價與行動鏈 */
    public dangerouslyPlay(card: IKnownCard) {
        if(TG.isUpgrade(card)) {
            // 把這件升級加入角色的裝備欄
            if(card.character_equipped) {
                card.character_equipped.addUpgrade(card);
            }
        } else if(TG.isCharacter(card)) {
            // 打出角色後把她加入角色區
            this.addCharacter(card);
        } else if(TG.isArena(card)) {
            // 打出場所的規則（把之前的建築拆了）
            let old = this.arenas[card.position];
            if(old) {
                this.retireCard(old);
            }
            this.arenas[card.position] = card;
            this.addArena(card, card.position);
        } else if(TG.isEvent(card)) {
            // 把事件加入待完成區
            this.addEvent(card);
        }
    }

    async triggerAbility(card: IKnownCard, a_index: number, by_keeper=false) {
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合使用能力？");
        }
        let ability = card.abilities[a_index];
        if(ability) {
            let cost = ability.cost ? ability.cost : 0;
            if(this.mana >= cost) {
                await this.ability_chain
                .triggerByKeeper(by_keeper, { card, a_index }, () => {
                    this.t_master.addActionPoint(-1);
                    ability.func();
                });
                return true;
            } else {
                return false;
            }
        }
    }

    async changeCharTired(char: ICharacter, is_tired: boolean) {
        await char.change_char_tired_chain.chain(this.change_char_tired_chain, { is_tired, char })
        .trigger(is_tired, () => {
            char.is_tired = is_tired;
        });
    }

    /** 當角色離開板面，不論退場還是放逐都會呼叫本函式。 */
    private async _leaveCard(card: IKnownCard) {
        await card.card_leave_chain.trigger(null, () => {
            // TODO: 如果角色在場所中，應該想辦法使其離開
            HR.onLeave(card, this.retireCard.bind(this));
        });
    }
    async retireCard(card: IKnownCard) {
        if(card.card_status == CardStat.Onboard) {
            let chain = card.card_retire_chain.chain(this.card_retire_chain, card);
            let can_die = chain.checkCanTrigger(null);
            if(can_die) {
                await chain.trigger(null, async () => {
                    await this._leaveCard(card);
                    card.card_status = CardStat.Retired;
                });
            }
        } else {
            throwIfIsBackend("重複銷毀一張卡片", card);
        }
    }
    async exileCard(card: IKnownCard) {
        await this._leaveCard(card);
        card.card_status = CardStat.Exile;
    }

    public readonly add_char_chain = new ActionChain<ICharacter>();
    private addCharacter(char: ICharacter) {
        this.add_char_chain.trigger(char, () => {
            this._characters.push(char);
        });
    }
    public readonly add_event_chain = new ActionChain<IEvent>();
    private addEvent(event: IEvent) {
        this.add_event_chain.trigger(event, () => {
            this._events_ongoing.push(event);
        });
    }
    public readonly add_arena_chain = new ActionChain<IArena>();
    private addArena(card: IArena, position: number) {
        this.add_arena_chain.trigger(card, () => {
            this._arenas[position] = card;
        });
    }

    // 底下這些處理事件卡的函式先不考慮「推進別人的事件」這種狀況
    async failEvent(event: IEvent) {
        await event.fail_chain.chain(this.fail_chain, event)
        .trigger(null, async () => {
            await Promise.resolve(event.onFail());
            this.retireCard(event);
        });
    }

    async finishEvent(char: ICharacter | null, event: IEvent) {
        // 應該不太需要 checkCanTrigger 啦 @@
        await event.finish_chain.chain(this.finish_chain, { event, char })
        .trigger(char, async () => {
            event.card_status = CardStat.Finished;
            this._events_finished.push(event);
            await Promise.resolve(event.onFinish(char));
            await Promise.resolve(event.setupFinishEffect(char));
        });
    }
    getPushCost(char: ICharacter | null, event: IEvent) {
        let cost_chain = event.get_push_cost_chain
        .chain(this.get_push_cost_chain, { event, char });
        if(TG.isCard(char)) {
            cost_chain.chain(char.get_push_cost_chain, event);
        }
        return cost_chain.trigger(event.push_cost, char);
    }
    async pushEvent(event: IEvent, char: ICharacter | null, by_keeper=false) {
        // TODO: 這裡應該要有一條 pre-push 動作鏈
        if(this.t_master.cur_player != this.player) {
            throw new BadOperationError("想在別人的回合推進事件？");
        }
        let push_chain = new ActionChain<ICharacter | null>();
        let cost = this.getPushCost(char, event);

        if(HR.checkPush(event, char, this.mana, cost)) {
            push_chain = event.push_chain.chain(this.push_chain, { event, char });
            if(TG.isCard(char)) {
                push_chain.chain(char.push_chain, event);
            }
            if(push_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                if(this.t_master.cur_phase == GamePhase.InAction) {
                    await this.t_master.addActionPoint(-1);
                }
                if(char) {
                    await this.changeCharTired(char, true);
                }

                return await push_chain.triggerByKeeper(by_keeper, char, async () => {
                    HR.onPushEvent(event);
                    await Promise.resolve(event.onPush(char));
                    if(event.cur_progress_count == event.goal_progress_count) {
                        // 事件已完成
                        await this.finishEvent(char, event);
                    }
                });
            }
        }
        throwIfIsBackend("取消推進事件");
        return false;
    }

    // 底下所有函式都是「我的角色」與「任何人的場所」
    getEnterCost(char: ICharacter, arena: IArena): number {
        // NOTE: 觸發順序：場所 -> 角色 -> 世界
        return arena.get_enter_cost_chain.chain(char.get_enter_cost_chain, arena)
        .chain(this.get_enter_cost_chain, { char, arena })
        .trigger(0, char);
    }
    async enterArena(arena: IArena, char: ICharacter, by_keeper=false) {
        // TODO: 這裡應該要有一條 pre-enter 動作鏈
        if(this.t_master.cur_player != char.owner) {
            throw new BadOperationError("想在別人的回合進入場所？");
        }
        let cost = this.getEnterCost(char, arena);

        if(HR.checkEnter(char, arena, this.mana, cost)) {
            let enter_chain = arena.enter_chain.chain(char.enter_arena_chain, arena)
            .chain(this.enter_chain, { char, arena });
            if(enter_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                if(this.t_master.cur_phase == GamePhase.InAction) {
                    await this.t_master.addActionPoint(-1);
                }
                await this.changeCharTired(char, true);
                
                return await enter_chain.triggerByKeeper(by_keeper, char, () => {
                    HR.onEnter(char, arena);
                });
            }
        }
        throwIfIsBackend("進入程序取消");
        return false;
    }
    getExploitCost(arena: IArena, char: ICharacter | Player) {
        let get_cost_chain = arena.get_exploit_cost_chain
        .chain(this.get_exploit_cost_chain, { arena, char });
        if(TG.isCard(char)) {
            get_cost_chain.chain(char.get_exploit_cost_chain, arena);
        }
        return get_cost_chain.trigger(arena.basic_exploit_cost, char);
    }
    async exploit(arena: IArena, char: ICharacter | Player, by_keeper=false) {
        let p = (() => {
            if(TG.isCard(char)) {
                return char.owner;
            } else {
                return char;
            }
        })();
        if(p != this.t_master.cur_player) {
            throw new BadOperationError("想在別人的回合使用場所？");
        }
        // TODO: 這裡應該要有一條 pre-exploit 動作鏈
        let cost = this.getExploitCost(arena, char);
        if(HR.checkExploit(arena, char, this.mana, cost)) {
            let exploit_chain = arena.exploit_chain
            .chain(this.exploit_chain, { arena, char });
            if(TG.isCard(char)) {
                exploit_chain.chain(char.exploit_chain, arena);
            }
            if(exploit_chain.checkCanTrigger(char)) {
                await this.addMana(-cost);
                await exploit_chain.triggerByKeeper(by_keeper, char, async () => {
                    let caller = [];
                    if(TG.isCard(char)) {
                        caller.push(char);
                        this.exitArena(char);
                    }
                    let income = await arena.onExploit(char);
                    if(income) {
                        this.addMana(income, caller);
                    }
                });
            }
        }
    }

    async exitArena(char: ICharacter) {
        let _arena = char.arena_entered;
        if(_arena) {
            let arena = _arena;
            this.exit_chain.trigger({ char, arena }, () => {
                char.char_status = CharStat.StandBy;
                char.arena_entered = null;
                arena.exit(char);
            });
        } else {
            throw new BadOperationError("不在場所的角色還想離開？");
        }
    }

    public readonly get_enter_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter }>();
    public readonly enter_chain = new ActionChain<{ arena: IArena, char: ICharacter }>();
    public readonly exit_chain = new ActionChain<{ arena: IArena, char: ICharacter }>();
    public readonly get_exploit_cost_chain = new GetterChain<number, { arena: IArena, char: ICharacter | Player }>();
    public readonly exploit_chain = new ActionChain<{ arena: IArena, char: ICharacter | Player }>();

}

class GameMaster {
    private _cur_seq = 1;
    public readonly card_table: { [index: number]: ICard } = {};

    public readonly t_master = new TimeMaster(p => this.getMyMaster(p).addMana(C.REST_MANA));

    private p_master1: PlayerMaster;
    private p_master2: PlayerMaster;

    constructor(public readonly selecter: ISelecter,
        private readonly genFunc: (name: string, owner: Player, seq: number, gm: GameMaster) => IKnownCard
    ) {
        this.p_master1 = new PlayerMaster(Player.Player1, this.selecter, this.t_master);
        this.p_master2 = new PlayerMaster(Player.Player2, this.selecter, this.t_master);
        selecter.setCardTable(this.card_table);
    }

    genUnknownToDeck(owner: Player) {
        let c = new UnknownCard(this._cur_seq++, owner);
        this.card_table[c.seq] = c;
        this.getMyMaster(owner).addCard(c);
    }
    private genCard(owner: Player, name: string): IKnownCard {
        let c = this.genFunc(name, owner, this._cur_seq++, this);
        this.card_table[c.seq] = c;
        return c;
    }
    genCardToDeck(owner: Player, name: string): IKnownCard {
        let c = this.genCard(owner, name);
        this.getMyMaster(owner).addCard(c);
        return c;
    }
    genCardToHand(owner: Player, name: string): IKnownCard {
        let c = this.genCard(owner, name);
        c.card_status = CardStat.Hand;
        this.getMyMaster(owner).addCard(c);
        return c;
    }
    // 應該就一開始會用到而已 吧？
    genArenaToBoard(owner: Player, pos: number, name: string): IArena {
        let arena = this.genCard(owner, name);
        if(TG.isArena(arena)) {
            arena.card_status = CardStat.Onboard;
            this.getMyMaster(owner).addCard(arena);
            arena.position = pos;
            this.getMyMaster(owner).dangerouslyPlay(arena);
            return arena;
        } else {
            throw new BadOperationError("嘗試將非場所卡加入建築區");
        }
    }
    genCharToBoard(owner: Player, name: string): ICharacter {
        let char = this.genCard(owner, name);
        if(TG.isCharacter(char)) {
            char.card_status = CardStat.Onboard;
            this.getMyMaster(owner).addCard(char);
            this.getMyMaster(owner).dangerouslyPlay(char);
            return char;
        } else {
            throw new BadOperationError("嘗試將非角色卡加入角色區");
        }
    }

    getMyMaster(arg: Player | IKnownCard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getMyMaster(arg.owner);
        } else if(arg == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(arg: Player | IKnownCard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getEnemyMaster(arg.owner);
        } else if(arg == Player.Player2) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    repulse(loser: ICharacter, winner: ICharacter | null) {
        // TODO:
    }
    getAll<T extends IKnownCard>(guard: (c: ICard) => c is T, filter?: (c: T) => boolean) {
        let list = new Array<T>();
        for(let seq in this.card_table) {
            let c = this.card_table[seq];
            if(guard(c)) {
                if(c.card_status == CardStat.Onboard) {
                    if(!filter || filter(c)) {
                        list.push(c);
                    }
                }
            }
        }
        return list;
    }

    public readonly battle_start_chain = new ActionChain<IArena>();
    public readonly get_battle_cost_chain = new GetterChain<number, IArena>();
    public readonly battle_end_chain = new ActionChain();

    public readonly before_conflict_chain
        = new ActionChain<{ def: ICharacter, atk: ICharacter, is_target: boolean }>();
    public readonly conflict_chain
        = new ActionChain<{ def: ICharacter, atk: ICharacter, is_target: boolean }>();
    public readonly repluse_chain
        = new ActionChain<{ loser: ICharacter, winner: ICharacter | null }>();
}

export {
    GameMaster, PlayerMaster
};