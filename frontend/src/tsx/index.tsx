import * as React from 'react'
import ReactDOM from "react-dom";
import { LoginPage } from './login';

class App extends React.Component {
    render() {
        return <LoginPage/>;
    }
}

ReactDOM.render(<App />, document.getElementById("root"));