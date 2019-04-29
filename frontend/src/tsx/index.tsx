import * as React from 'react'
import ReactDOM from "react-dom";
import { LoginPage } from './login';

import {
	BrowserRouter as Router,
	Switch,
	Route,
} from "react-router-dom";
import { RegisterPage } from './register';
import { DeckBuilderPage } from './deck_builder';
import { HomePage } from './home_page';

class App extends React.Component<{}, { login: boolean, userid: string }> {
    constructor(props) {
        super(props);
        this.state = {
            login: false,
            userid: ""
        }
    }
    changeLoginState(userid?: string) {
        if(userid) {
            this.setState({ userid, login: true });
        } else {
            this.setState({ login: false });
        }
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
                        <Switch>
                            <Route exact path="/app" render={props => (
                                <HomePage route_props={props} {...this.state}
                                    changeLoginState={this.changeLoginState.bind(this)} />
                            )} />
                            <Route exact path="/app/deck_builder" render={props => (
                                <DeckBuilderPage route_props={props} {...this.state}
                                    changeLoginState={this.changeLoginState.bind(this)} />
                            )} />
                        </Switch>
                    </div>
                </Router>
            );
        } else {
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
        }
    }
}

ReactDOM.render(<App />, document.getElementById("root"));