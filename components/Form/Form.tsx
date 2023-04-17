import React, {ReactNode, useEffect, useState} from "react";
import FormItem from "./FormItem";

interface Props extends React.FormHTMLAttributes<HTMLFormElement>{
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
        <form className="py-1 px-2" {...props}>
            <Content.Provider value={state}>
                {props.children}
            </Content.Provider>
        </form>
    )
}
Form.FormItem = FormItem
