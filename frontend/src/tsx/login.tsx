import * as React from 'react'
import { PageProps } from './props';

type State = {
    userid: string,
    password: string
};

export class LoginPage extends React.Component<PageProps, State> {
    constructor(props: PageProps) {
        super(props);
        this.state = {
            userid: "",
            password: ""
        };
    }
    onIDChange(evt: React.FormEvent<HTMLInputElement>) {
        this.setState({ userid: evt.currentTarget.value })
    }
    onPassChange(evt: React.FormEvent<HTMLInputElement>) {
        this.setState({ password: evt.currentTarget.value })
    }
    async doLogin() {
        let res = await fetch("/api/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                userid: this.state.userid,
                password: this.state.password
            }),
        })
        if(res.ok) {
            this.props.changeLoginState(this.state.userid);
        }
    }
    keyDown(evt: React.KeyboardEvent) {
        if(evt.key == "Enter") {
            this.doLogin();
        }
    }
    render() {
        return (
            <div>
                <input type="text" onChange={this.onIDChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.userid} />
                <br />
                <input type="password" onChange={this.onPassChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.password} />
                <button onClick={this.doLogin.bind(this)}>登入</button>
            </div>
        );
    }
}