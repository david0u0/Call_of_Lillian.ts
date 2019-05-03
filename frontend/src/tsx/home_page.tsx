import * as React from 'react'
import { PageProps } from './props';

type Deck = {
    name: string,
    description?: string,
    _id: string,
    first_card: string | null
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
    editDeck() {
        let url = `/deck_builder?_id=${this.state.cur_selecting_deck}`;
        window.location.href = url;
    }
    selectDeck(_id: string) {
        this.setState({ cur_selecting_deck: _id });
    }
    async deleteDeck(_id: string) {
        if(confirm("確定要刪除牌組？")) {
            let res = await fetch("/api/deck/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _id })
            });
            if(res.ok) {
                let new_deck = this.state.decks.filter(d => d._id != _id);
                this.setState({ decks: new_deck });
            }
        }
    }
    async changeName(_id: string, name: string) {
        let res = await fetch("/api/deck/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id, name })
        });
        if(res.ok) {
            let new_deck = await res.json();
            let decks = [...this.state.decks];
            for(let [i, deck] of decks.entries()) {
                if(deck._id == _id) {
                    decks = [...decks.slice(0, i), new_deck, ...decks.slice(i+1)];
                    this.setState({ decks });
                    return;
                }
            }
        }
        throw "找不到更新的牌組";
    }
    async newDeck() {
        let res = await fetch("/api/deck/new", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: "新牌組",
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
                                    <DeckBlock key={deck._id} {...deck}
                                        highlight_id={this.state.cur_selecting_deck}
                                        onNameChange={name => this.changeName(deck._id, name)}
                                        onDelete={() => this.deleteDeck(deck._id)}
                                        onClick={() => this.selectDeck(deck._id)} />
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

type DeckBlockProps = (
    (Deck & { highlight_id: string | null, onNameChange: (name: string) => void, onDelete: () => void })
    | { is_new: true }
) & { onClick: () => void };

type DeckBlockState = {
    changing_name: boolean,
    tmp_name: string
};

class DeckBlock extends React.Component<DeckBlockProps, DeckBlockState> {
    public static readonly WIDTH = 70;
    public static readonly HEIGHT = 100;
    constructor(props) {
        super(props);
        this.state = {
            changing_name: false,
            tmp_name: ("name" in this.props) ? this.props.name : ""
        };
    }
    private tmp_input: HTMLInputElement;
    doChangeName(start: boolean) {
        this.setState({ changing_name: start });
        setTimeout(async () => {
            if("name" in this.props) {
                if(start) {
                    this.setState({ tmp_name: this.props.name });
                    this.tmp_input.focus();
                } else {
                    if(this.props.name != this.state.tmp_name) {
                        this.props.onNameChange(this.state.tmp_name);
                    }
                }
            }
        });
    }
    onTmpNameChange(evt: React.FormEvent<HTMLInputElement>) {
        this.setState({ tmp_name: evt.currentTarget.value })
    }
    onTmpNameKeyDown(evt: React.KeyboardEvent) {
        if(evt.key == "Enter") {
            this.doChangeName(false);
        }
    }
    renderLabel() {
        let style = { margin: 0, display: "block", width: DeckBlock.WIDTH };
        if(this.state.changing_name) {
            return <input style={style}
                value={this.state.tmp_name}
                ref={input => this.tmp_input = input}
                onChange={this.onTmpNameChange.bind(this)}
                onBlur={() => this.doChangeName(false)}
                onKeyDown={this.onTmpNameKeyDown.bind(this)} />
        } if("name" in this.props) {
            return <p onClick={() => this.doChangeName(true)}
                style={style} >{this.props.name}</p>;
        } else {
            return <p style={style}>新增牌組</p>;
        }
    }
    render() {
        let opacity = 1;
        let first_card_src = require("../../assets/card_back.png");
        if("_id" in this.props) {
            if(this.props.highlight_id != this.props._id) {
                opacity = 0.6;
            }
            if(this.props.first_card) {
                first_card_src = `/card_image/${this.props.first_card}.jpg`;
            }
        }
        return (
            <div style={{ float: "left", margin: 10, cursor: "pointer", opacity, position: "relative" }}>
                {
                    (() => {
                        if("_id" in this.props) {
                            return <div style={{
                                position: "absolute",
                                right: -10,
                                top: -10,
                                backgroundColor: "#e84f73",
                                borderRadius: 12,
                                width: 25,
                                height: 25,
                                textAlign: "center",
                            }} onClick={this.props.onDelete}>X</div>
                        } else {
                            return null
                        }
                    })()
                }
                <img src={first_card_src} onClick={this.props.onClick}
                    style={{ width: DeckBlock.WIDTH, height: DeckBlock.HEIGHT, margin: 0 }}
                />
                {this.renderLabel()}
            </div>
        );
    }
}