import * as React from "react"
import ReactDOM from "react-dom";
import { LoginPage } from "./login";

import {
	BrowserRouter as Router,
	Switch,
	Route,
    Redirect,
} from "react-router-dom";
import { RegisterPage } from "./register";
import { HomePage } from "./home_page";

type State = {
    login: boolean,
    userid: string,
    loading: boolean
}

class App extends React.Component<{}, State> {
    constructor(props) {
        super(props);
        this.state = {
            login: false,
            userid: "",
            loading: true,
        }
    }
    changeLoginState(userid?: string) {
        if(userid) {
            this.setState({ userid, login: true, loading: false });
        } else {
            this.setState({ login: false, loading: false });
        }
    }
    async logout() {
        fetch("/api/user/logout").then(res => {
            if(res.ok) {
                this.changeLoginState();
            }
        })
    }
    componentDidMount() {
        fetch("/api/user/who")
        .then(res => {
            if(res.ok) {
                return res.json().then(data => {
                    this.changeLoginState(data["userid"]);
                });
            } else {
                // TODO: error
            }
        });
    }
    render() {
        if(this.state.login) {
            return (
                <Router>
                    <div>
                        <button onClick={this.logout.bind(this)}>登出</button>
                        <br />
                        <Switch>
                            <Route exact path="/app" render={props => (
                                <HomePage route_props={props} {...this.state}
                                    changeLoginState={this.changeLoginState.bind(this)} />
                            )} />
                            <Redirect to="/app"/>
                        </Switch>
                    </div>
                </Router>
            );
        } else if(!this.state.loading) {
            return (
                <Router>
                    <div>
                        <Switch>
                            <Route exact path="/app/register" render={props => (
                                <RegisterPage route_props={props} {...this.state}
                                    changeLoginState={this.changeLoginState.bind(this)} />
                            )} />
                            <Route path="(/app/*|/app)" render={props => (
                                <LoginPage route_props={props} {...this.state}
                                    changeLoginState={this.changeLoginState.bind(this)} />
                            )} />
                        </Switch>
                    </div>
                </Router>
            );
        } else {
            return null;
        }
    }
}

ReactDOM.render(<App />, document.getElementById("root"));