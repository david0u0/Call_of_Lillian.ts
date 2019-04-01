import { IKnownCard, ISelecter } from "../../game_core/interface";

export default class FrontendSelecter implements ISelecter {
    private card_table: { [index: number]: IKnownCard } = {};
    setCardTable(table: { [index: number]: IKnownCard }) {
        this.card_table = table;
    }

    selectSingleCard<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        throw "not implemented!";
    }

    selectSingleCardInteractive<T extends IKnownCard>(guard: (c: IKnownCard) => c is T,
        check: (card: T) => boolean
    ): Promise<T | null> {
        throw "not implemented!";
    }
}