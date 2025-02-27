import React from "react";
import {uploadFile} from "../api/file";
import {Progress} from "@heroui/react";

interface Props {
    file: File

    onClick?: (name: string, url: string) => void
}

interface State {
    status: "default" | "primary" | "secondary" | "success" | "warning" | "error" | undefined
    process: number
    url: string
    afterUpload: boolean
}

export default class FileUploader extends React.Component<Props, State> {
    state: State = {
        status: undefined,
        process: 0,
        url: '',
        afterUpload: true
    }
    private form: FormData | null = null;

    componentDidMount() {
        if (this.form) {
            return
        }
        const form = new FormData()
        this.form = form
        form.append("file", this.props.file)
        uploadFile(form, (e: ProgressEvent) => {
            this.setState({
                process: e.loaded / e.total,
                status: "primary"
            });
        }).then(({data}) => {
            this.setState({
                url: data.data,
                process: 100,
                status: "success"
            })
            setTimeout(() => {
                this.setState({
                    afterUpload: true
                })
            }, 1500)
        }).catch(() => {
            this.setState({
                status: "error"
            })
        })
    }

    render() {
        if (this.state.afterUpload) {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={this.state.url} alt={"预览"} width={255} className={"cursor-pointer"}
                        onClick={this.props.onClick?.bind(this, this.props.file.name, this.state.url)}/>
        } else {
            return <Progress value={this.state.process} status={this.state.status} color={"gradient"}/>
        }
    }
}
