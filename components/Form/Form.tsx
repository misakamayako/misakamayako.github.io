import React, {ReactNode, useEffect, useState} from "react";
import FormItem from "./FormItem";

interface Props extends React.FormHTMLAttributes<HTMLFormElement>{
    labelWidth?: number,
    children?: ReactNode
}

export const Content = React.createContext(120)
export default function Form({labelWidth, children,...rest}: Props) {
    const [state, updateState] = useState(labelWidth ?? 120)
    useEffect(() => {
        updateState(labelWidth ?? 0)
    }, [labelWidth])
    return (
        <form className="py-1 px-2" {...rest}>
            <Content.Provider value={state}>
                {children}
            </Content.Provider>
        </form>
    )
}
Form.FormItem = FormItem
