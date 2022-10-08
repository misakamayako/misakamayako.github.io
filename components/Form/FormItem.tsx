import {ReactNode, useContext} from "react";
import {Content} from "./Form";
import FormItemStyle from './FormItem.module.scss'

interface Props {
    label?: string,
    children?:ReactNode
}

export default function FormItem(Props: Props) {
    const width = useContext(Content)
    return (
        <div className={FormItemStyle.formItem}>
            <label className={FormItemStyle.formItemLabel} style={{width}}>{Props.label}</label>
            <div style={{marginLeft: width}} className={FormItemStyle.formItemContent}>
                <div>{Props.children}</div>
            </div>
        </div>
    )
}
