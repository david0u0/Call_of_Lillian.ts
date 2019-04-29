import * as React from 'react'

type State = {
    name: string,
    password: string
};

export class LoginPage extends React.Component<{}, State> {
    constructor(props: {}) {
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
        let res = await fetch("/login", {
            body: JSON.stringify({
                name: this.state.name,
                password: this.state.password
            }),
            method: "POST"
        })
        if(res.status >= 200 && res.status < 300) {
            
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
                <input type="text" onChange={this.onNameChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.name}/>
                <br/>
                <input type="password" onChange={this.onPassChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.password}/>
                <button onClick={this.doLogin.bind(this)}>登入</button>
            </div>
        );
    }
}