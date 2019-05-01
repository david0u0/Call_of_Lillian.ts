import * as React from 'react'
import { PageProps } from './props';

type Deck = {
    name: string,
    description?: string,
    id: string
};
type State = {
    cur_selecting_deck: string,
    loading: boolean
    decks: Deck[]
};

export class HomePage extends React.Component<PageProps, State> {
    constructor(props: PageProps) {
        super(props);
        this.state = {
            cur_selecting_deck: null,
            loading: true,
            decks: []
        };
    }
    async componentDidMount() {
        let res = await fetch("/api/deck/list");
        let list = await res.json();
        if(list instanceof Array) {
            this.setState({ decks: list, loading: false });
        } else {
            //
        }
    }
    startGame() {
        window.location.href = "/game";
    }
    editDeck(id: string) {
        let url = `/deck_builder?id=${this.state.cur_selecting_deck}`;
        window.location.href = url;
    }
    selectDeck(id: string) {
        this.setState({ cur_selecting_deck: id });
    }
    async newDeck() {
        let res = await fetch("/api/deck/new", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "test",
                list: []
            }),
        });
        if(res.ok) {
            let data = await res.json();
            this.setState({ decks: [...this.state.decks, data] });
        }
    }
    render() {
        if(this.state.loading) {
            return null;
        } else {
            let disabled = this.state.cur_selecting_deck ? false : true;
            return (
                <div>
                    <div>
                        {
                            this.state.decks.map(deck => {
                                return (
                                    <DeckBlock key={deck.id} {...deck}
                                        highlight_id={this.state.cur_selecting_deck}
                                        onClick={(id: string) => this.selectDeck(id)} />
                                );
                            })
                        }
                        <DeckBlock is_new={true} onClick={() => this.newDeck()} />
                        <div style={{ clear: "both" }} />
                    </div>
                    <br/>
                    <button onClick={this.editDeck.bind(this)} disabled={disabled}>編輯牌組</button>
                    <button onClick={this.startGame.bind(this)} disabled={disabled}>開戰啦！</button>
                </div>
            );
        }
    }
}

type DeckBlockProps = ((Deck & { highlight_id: string | null}) | { is_new: true })
    & { onClick: (id?: string) => void };

class DeckBlock extends React.Component<DeckBlockProps> {
    render() {
        let onClick: () => void;
        let opacity = 1;
        let name: string;
        if("is_new" in this.props) {
            onClick = () => this.props.onClick();
            name = "新增牌組";
        } else {
            let id = this.props.id;
            onClick = () => this.props.onClick(id);
            if(this.props.highlight_id != id) {
                opacity = 0.6;
            }
            name = this.props.name;
        }
        return (
            <div style={{ float: "left", margin: 10, cursor: "pointer" }}>
                <img src={require("../../assets/card_back.png")} onClick={onClick}
                    style={{ opacity, height: 100, margin: 0 }}
                />
                <p style={{ marginTop: 0 }}>{name}</p>
            </div>
        );
    }
}