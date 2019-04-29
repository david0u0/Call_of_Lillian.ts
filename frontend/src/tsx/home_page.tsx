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
    render() {
        return <h1>趕工中...</h1>;
    }
}