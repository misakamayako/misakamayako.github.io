import React, {createRef} from "react";
import type {FormElement} from "@nextui-org/react";
import {Input, Loading} from "@nextui-org/react";

import autocompleteStyle from "./Autocomplete.module.scss";
import Empty from "../Empty/Empty";
import debounce from "../../utils/debounce";

interface State {
    searchText: string
    loading: boolean
    showPopover: boolean
}

interface SelectItem<T> {
    value: T
    text: string
}

interface Props<T> {
    dataSource: SelectItem<T>[]
    onChange: (value: string) => Promise<any> | void
    onSelected: (item: SelectItem<T>) => void
    onEnter?: (value: string) => void
    onCreateNew?: (value: string) => void | Promise<void>
}


export default class Autocomplete<T> extends React.Component<Props<T>, State> {
    state: State = {
        searchText: "",
        loading: false,
        showPopover: false
    }

    target = createRef<HTMLDivElement>()

    private handleCreate() {
        const callback = this.props.onCreateNew!(this.state.searchText)
        this.setState({
            showPopover: false
        })
        document.removeEventListener("click", this.autoClose)
        if (callback instanceof Promise) {
            this.setState({
                loading: true
            })
            callback.finally(() => {
                this.setState({
                    loading: false
                })
            })
        }
    }

    private autoClose(ev: MouseEvent) {
        const target = this.target.current
        let current: HTMLElement | null = ev.target as HTMLElement
        while (current != null && current != target) {
            current = current.parentElement
        }
        if (current != target) {
            this.setState({
                showPopover: false
            })
            document.removeEventListener("click", this.autoClose)
        }
    }

    private handleChange(e: React.ChangeEvent<FormElement>) {
        const text = e.target.value
        this.setState({
            searchText: text
        })
        this.emit(text)
    }

    private emit = debounce((word: string) => {
        const callback = this.props.onChange(word)
        if (callback instanceof Promise) {
            this.setState({
                loading: true
            })
            callback.then(()=>{
                if (!this.state.showPopover) {
                    document.addEventListener("click", this.autoClose.bind(this))
                }
            }).finally(() => {
                this.setState({
                    loading: false,
                    showPopover:true
                })
            })
        } else {
            if (!this.state.showPopover) {
                document.addEventListener("click", this.autoClose.bind(this))
            }
            this.setState({
                showPopover:true
            })
        }
    }, 800)


    render() {
        return (
            <div className={autocompleteStyle.autocompleteBox} ref={this.target}>
                <Input
                    value={this.state.searchText}
                    onChange={this.handleChange.bind(this)}
                    css={{width:"100%"}}
                    className={"w-full"}
                    aria-label={"keywords"}
                    contentRight={this.state.loading ? <Loading size="xs"/> : null}
                />
                {
                    this.state.showPopover ?
                        <div className={autocompleteStyle.autocompletePopover}>
                            {
                                this.props.dataSource.length > 0 ?
                                    this.props.dataSource.map(item => (
                                        <div
                                            key={item.text}
                                            className={autocompleteStyle.autocompleteOptionItem}
                                            onClick={this.handleItemClick.bind(this, item)}
                                        >
                                            {item.text}
                                        </div>
                                    ))
                                    : <Empty>
                                        {
                                            this.props.onCreateNew ?
                                                <span className={"text-cyan-500"}>
                                                    点击
                                                    <span className={"cursor-pointer text-cyan-200"}
                                                          onClick={this.handleCreate.bind(this)}>这里</span>
                                                    新增
                                                </span> :
                                                null
                                        }
                                    </Empty>
                            }
                        </div>
                        : null
                }
            </div>
        )
    }

    private handleItemClick(item: SelectItem<T>) {
        this.props.onSelected(item)
        setTimeout(() => {
            this.setState({
                showPopover: false
            })
            document.removeEventListener("click", this.autoClose)
        })
    }
}
