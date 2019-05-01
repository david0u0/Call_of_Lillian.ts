import * as React from "react"
import { PageProps } from "./props";
import { Link } from "react-router-dom";

type State = {
    userid: string,
    password: string,
    confirm_password: string,
};

export class RegisterPage extends React.Component<PageProps, State> {
    constructor(props: PageProps) {
        super(props);
        this.state = {
            userid: "",
            password: "",
            confirm_password: "",
        };
    }
    onNameChange(evt: React.FormEvent<HTMLInputElement>) {
        this.setState({ userid: evt.currentTarget.value })
    }
    onPassChange(is_confirm: boolean, evt: React.FormEvent<HTMLInputElement>) {
        if(is_confirm) {
            this.setState({ confirm_password: evt.currentTarget.value })
        } else {
            this.setState({ password: evt.currentTarget.value })
        }
    }
    async doRegister() {
        if(this.state.password == this.state.confirm_password) {
            let res = await fetch("/api/user/register", {
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
        } else {
            alert("兩次密碼不同");
        }
    }
    keyDown(evt: React.KeyboardEvent) {
        if(evt.key == "Enter") {
            this.doRegister();
        }
    }
    render() {
        return (
            <div>
                <p style={{ marginTop: 10, marginBottom: 0 }}>帳號</p>
                <input type="text" onChange={this.onNameChange.bind(this)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.userid} />
                <p style={{ marginTop: 10, marginBottom: 0 }}>密碼</p>
                <input type="password" onChange={this.onPassChange.bind(this, false)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.password} />
                <p style={{ marginTop: 10, marginBottom: 0 }}>確認密碼</p>
                <input type="password" onChange={this.onPassChange.bind(this, true)}
                    onKeyDown={this.keyDown.bind(this)} value={this.state.confirm_password} />
                <br />
                <button onClick={this.doRegister.bind(this)}>確認</button>
                <Link to="/app/login">回登入頁面</Link>
            </div>
        );
    }
}