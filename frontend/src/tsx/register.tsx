import * as React from 'react'
import { PageProps } from './props';

type State = {
    name: string,
    password: string
};

export class RegisterPage extends React.Component<PageProps, State> {
    constructor(props: PageProps) {
        super(props);
        this.state = {
            name: "",
            password: ""
        };
    }
    onNameChange(evt: React.FormEvent<HTMLInputElement>) {
        this.setState({ name: evt.currentTarget.value })
    }
    onPassChange(evt: React.FormEvent<HTMLInputElement>) {
        this.setState({ password: evt.currentTarget.value })
    }
    async doLogin() {
        let res = await fetch("/api/user/register", {
            body: JSON.stringify({
                name: this.state.name,
                password: this.state.password
            }),
            method: "POST"
        })
        if(res.ok) {
            this.props.changeLoginState(this.state.name);
        }
    }
    keyDown(evt: React.KeyboardEvent) {
        if(evt.key == "Enter") {
            this.doLogin();
        }
    }
    render() {
        if(this.props.login) {
            this.props.route_props.history.push("/index.html");
            return null;
        } else {
            return (
                <div>
                    <input type="text" onChange={this.onNameChange.bind(this)}
                        onKeyDown={this.keyDown.bind(this)} value={this.state.name} />
                    <br />
                    <input type="password" onChange={this.onPassChange.bind(this)}
                        onKeyDown={this.keyDown.bind(this)} value={this.state.password} />
                    <input type="password" onChange={this.onPassChange.bind(this)}
                        onKeyDown={this.keyDown.bind(this)} value={this.state.password} />
                    <button onClick={this.doLogin.bind(this)}>登入</button>
                </div>
            );
        }
    }
}