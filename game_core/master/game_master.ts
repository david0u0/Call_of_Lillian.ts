import { Player, CardStat, BattleRole, CharStat, GamePhase, RuleEnums } from "../enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG, ISelecter, UnknownCard } from "../interface";
import { ActionChainFactory } from "./action_chain_factory";
import { throwIfIsBackend, BadOperationError } from "../errors";
import { SoftRule as SR, HardRule as HR, Constant as C } from "../general_rules";
import { TimeMaster } from "./time_master";
import { PlayerMaster } from "./player_master";
import { WarMaster } from "./war_master";

type KnownCardGenerator = (abs_name: string, owner: Player, seq: number, gm: GameMaster) => IKnownCard;

export class GameMaster {
    private _cur_seq = 1;
    public readonly card_table: { [seq: number]: ICard } = {};

    public readonly acf = new ActionChainFactory();
    public readonly t_master = new TimeMaster(this.acf);
    public readonly w_master = new WarMaster(this.acf, this.t_master, this.card_table,
        this.getMyMaster.bind(this), this.getEnemyMaster.bind(this));

    private p_master1: PlayerMaster;
    private p_master2: PlayerMaster;

    constructor(public readonly selecter: ISelecter,
        private readonly genFunc: KnownCardGenerator
    ) {
        this.p_master1 = new PlayerMaster(this.acf, Player.Player1, this.t_master, c => this.getMyMaster(c));
        this.p_master2 = new PlayerMaster(this.acf, Player.Player2, this.t_master, c => this.getMyMaster(c));
        selecter.setCardTable(this.card_table);

        this.t_master.rest_chain.append(async () => {
            if(!this.t_master.someoneResting()) {
                await this.getMyMaster(this.t_master.cur_player).addMana(C.REST_MANA);
            }
        });

        for(let pm of [this.p_master1, this.p_master2]) {
            pm.finish_chain.append(({ event }) => {
                return {
                    after_effect: async () => {
                        if(event.is_ending) {
                            await this.endGame();
                        }
                    }
                };
            }, undefined, RuleEnums.EndGameAfterFinish);
        }
    }

    private genCard(stat: CardStat, owner: Player,
        arg: string | (() => IKnownCard)): Promise<IKnownCard>;
    private genCard(stat: CardStat, owner: Player): Promise<UnknownCard>;
    private async genCard(stat: CardStat, owner: Player,
        arg?: string | (() => IKnownCard)
    ) {
        let c: IKnownCard | UnknownCard;
        if(typeof arg == "undefined") {
            c = new UnknownCard(this._cur_seq++, owner);
        } else if(typeof arg == "string") {
            c = this.genFunc(arg, owner, this._cur_seq++, this);
        } else {
            c = arg();
            c.dangerouslySetSeq(this._cur_seq++);
        }
        this.card_table[c.seq] = c;
        c.card_status = stat;
        await this.getMyMaster(owner).addCard(c);
        return c;
    }

    genCardToDeck(owner: Player, abs_name: string): Promise<IKnownCard>;
    genCardToDeck(owner: Player): Promise<UnknownCard>;
    genCardToDeck(owner: Player, abs_name?: string) {
        if(abs_name) {
            return this.genCard(CardStat.Deck, owner, abs_name);
        } else {
            return this.genCard(CardStat.Deck, owner);
        }
    }

    genCardToHand(owner: Player, abs_name: string): Promise<IKnownCard>;
    genCardToHand(owner: Player): Promise<UnknownCard>;
    async genCardToHand(owner: Player, abs_name?: string) {
        let c: IKnownCard | UnknownCard;
        if(abs_name) {
            c = await this.genCard(CardStat.Hand, owner, abs_name);
        } else {
            c = await this.genCard(CardStat.Hand, owner);
        }
        c.card_status = CardStat.Hand;
        return c;
    }

    genCardToBoard(owner: Player, abs_name: string): Promise<IKnownCard>;
    genCardToBoard<T extends IKnownCard>(owner: Player, card_init: () => T): Promise<T>;
    async genCardToBoard<T extends IKnownCard = IKnownCard>(
        owner: Player, arg: string | (() => T)
    ): Promise<IKnownCard> {
        let card: IKnownCard;
        card = await this.genCard(CardStat.Onboard, owner, arg);
        await this.getMyMaster(owner).dangerouslySetToBoard(card);
        if(TG.isCharacter(card)) {
            await this.getMyMaster(owner).changeCharTired(card, true);
        }
        return card;
    }

    constructSameCard<T extends IKnownCard>(card: T): T {
        let res = this.genFunc(card.name, card.owner, -1, this);
        if(TG.isSameCard(card, res)) {
            return res;
        } else {
            throw new BadOperationError("用同個名字創出的卡牌竟然不是同類？");
        }
    }

    getMyMaster(arg: Player | ICard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getMyMaster(arg.owner);
        } else if(arg == Player.Player1) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
    }
    getEnemyMaster(arg: Player | ICard): PlayerMaster {
        if(TG.isCard(arg)) {
            return this.getEnemyMaster(arg.owner);
        } else if(arg == Player.Player2) {
            return this.p_master1;
        } else {
            return this.p_master2;
        }
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
    async playCard(card: IKnownCard, by_keeper=false) {
        await this.getMyMaster(card).playCard(card, by_keeper);
    }
    public readonly expose_card_chain = this.acf.new<ICard>();
    async exposeCard(card: ICard): Promise<IKnownCard> {
        // FIXME: 前後端溝通
        let known = card as IKnownCard;
        await this.expose_card_chain.trigger(known, this.t_master.nonce);
        return known;
    }

    public end_game_chain = this.acf.new<Player>();
    private async endGame() {
        let winner: Player;
        let score1 = this.p_master1.getScore();
        let score2 = this.p_master2.getScore();
        let ending_count1 = this.p_master1.getAll(TG.isEvent, e => e.is_ending).length;
        let ending_count2 = this.p_master2.getAll(TG.isEvent, e => e.is_ending).length;
        if(score1 == score2) {
            if(ending_count1 == ending_count2) {
                // 如果同分結局數也相同，先手玩家獲勝
                winner = this.t_master.first_player;
            } else {
                // 如果同分，比誰結局多
                winner = ending_count1 > ending_count2 ? Player.Player1 : Player.Player2;
            }
        } else {
            // 比誰分數高
            winner = score1 > score2 ? Player.Player1: Player.Player2;
        }
        await this.end_game_chain.trigger(winner, this.t_master.nonce);
    }
}