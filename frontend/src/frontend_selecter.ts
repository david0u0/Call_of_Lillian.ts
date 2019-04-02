import { IKnownCard, ISelecter } from "../../game_core/interface";

type CardLike = IKnownCard|null;

export default class FrontendSelecter implements ISelecter {
    private resolve_card: (arg: CardLike|PromiseLike<CardLike>) => void = null;

    private card_table: { [index: number]: IKnownCard } = {};
    setCardTable(table: { [index: number]: IKnownCard }) {
        this.card_table = table;
    }

    selectSingleCard<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        return new Promise<T|null>(resolve => {
            this.resolve_card = resolve;
        });
    }

    selectSingleCardInteractive<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        throw "not implemented!";
    }

    onCardClicked(IKnownCard) {

    }
}