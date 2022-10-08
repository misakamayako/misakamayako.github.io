import React, {ReactNode, useEffect, useState} from "react";
import FormItem from "./FormItem";

interface Props {
    labelWidth?: number,
    children?: ReactNode
}

export const Content = React.createContext(120)
export default function Form(props: Props) {
    const [state, updateState] = useState(props.labelWidth ?? 120)
    useEffect(() => {
        updateState(props.labelWidth ?? 0)
    }, [props.labelWidth])
    return (
        <form className="py-1">
            <Content.Provider value={state}>
                {props.children}
            </Content.Provider>
        </form>
    )

}
Form.FormItem = FormItem
