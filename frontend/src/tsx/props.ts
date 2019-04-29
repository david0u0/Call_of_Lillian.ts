import { RouteComponentProps } from "react-router-dom";

export type PageProps = {
    route_props: RouteComponentProps,
    login: boolean,
    userid: string,
    changeLoginState: (userid?: string) => void
}