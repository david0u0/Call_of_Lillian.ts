import { Player, CardStat, BattleRole, CharStat, GamePhase } from "../enums";
import { ICard, IKnownCard, ICharacter, IArena, IEvent, TypeGaurd as TG, ISelecter, UnknownCard } from "../interface";
import { ActionChain, GetterChain } from "../hook";
import { throwIfIsBackend, BadOperationError } from "../errors";
import { SoftRule as SR, HardRule as HR, Constant as C } from "../general_rules";
import { TimeMaster } from "./time_master";
import { PlayerMaster } from "./player_master";
import { WarMaster } from "./war_master";

export class GameMaster {
    private _cur_seq = 1;
    public readonly card_table: { [seq: number]: ICard } = {};

    public readonly t_master = new TimeMaster(p => this.getMyMaster(p).addMana(C.REST_MANA));
    public readonly w_master = new WarMaster(this.t_master, this.card_table,
        this.getMyMaster.bind(this), this.getEnemyMaster.bind(this));

    private p_master1: PlayerMaster;
    private p_master2: PlayerMaster;

    constructor(public readonly selecter: ISelecter,
        private readonly genFunc: (name: string, owner: Player, seq: number, gm: GameMaster) => IKnownCard
    ) {
        this.p_master1 = new PlayerMaster(Player.Player1, this.t_master, c => this.getMyMaster(c));
        this.p_master2 = new PlayerMaster(Player.Player2, this.t_master, c => this.getMyMaster(c));
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
    async genArenaToBoard(owner: Player, pos: number, name: string): Promise<IArena> {
        let arena = this.genCard(owner, name);
        if(TG.isArena(arena)) {
            arena.card_status = CardStat.Onboard;
            await this.getMyMaster(owner).addCard(arena);
            arena.position = pos;
            await this.getMyMaster(owner).dangerouslyGenToBoard(arena);
            return arena;
        } else {
            throw new BadOperationError("嘗試將非場所卡加入建築區");
        }
    }
    async genCharToBoard(owner: Player, name: string): Promise<ICharacter> {
        let char = this.genCard(owner, name);
        if(TG.isCharacter(char)) {
            char.card_status = CardStat.Onboard;
            await this.getMyMaster(owner).addCard(char);
            await this.getMyMaster(owner).dangerouslyGenToBoard(char);
            await this.getMyMaster(owner).changeCharTired(char, true);
            return char;
        } else {
            throw new BadOperationError("嘗試將非角色卡加入角色區");
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
        this.getMyMaster(card).playCard(card, by_keeper);
    }
}