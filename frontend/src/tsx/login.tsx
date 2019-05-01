import * as React from "react"
import { PageProps } from "./props";
import { Link } from "react-router-dom";

type State = {
    userid: string,
    password: string,
};

export class LoginPage extends React.Component<PageProps, State> {
    constructor(props: PageProps) {
        super(props);
        this.state = {
            userid: "",
            password: "",
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
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userid: this.state.userid,
                password: this.state.password
            }),
        })
        if(res.ok) {
            this.props.changeLoginState(this.state.userid);
        } else {
            let msg = await res.text();
            alert(msg);
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
                <p style={{ marginTop: 10, marginBottom: 0 }}>帳號</p>
                <input type="text" onChange={this.onIDChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.userid} />
                <p style={{ marginTop: 10, marginBottom: 0 }}>密碼</p>
                <input type="password" onChange={this.onPassChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.password} />
                <br />
                <button onClick={this.doLogin.bind(this)}>登入</button>
                <Link to="/app/register">註冊</Link>
            </div>
        );
    }
}