import * as React from 'react'
import { PageProps } from './props';

type State = {
    name: string,
    password: string
};

export class HomePage extends React.Component<PageProps, State> {
    constructor(props: PageProps) {
        super(props);
    }
    startGame() {
        window.location.href = "/game";
    }
    render() {
        return <button onClick={this.startGame.bind(this)}>開戰啦！</button>;
    }
}