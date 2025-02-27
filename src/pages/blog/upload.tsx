import React from "react";
import BlogLayout from "../../components/layout/BlogLayout";
import {Button, Checkbox, Input, Loading, Textarea} from "@heroui/react";
import {addCategory, getCategory} from "../../api/category";
import AlertService from "../../utils/AlertService";
import FileUploader from "../../components/FileUploader";
import {uploadArticle} from "../../api/article";
import {CategoryDTO} from "../../DTO/Category";


interface State {
    categories: Array<CategoryDTO>,
    files: Array<File>,
    title: string
    content: string
    uploading: boolean
    selectedCategories: string[]
}

export default class Upload extends React.Component<{}, State> {
    state: State = {
        categories: [],
        files: [],
        title: '',
        content: '',
        uploading: false,
        selectedCategories: []
    }

    static getLayout(page: React.ReactElement<React.JSXElementConstructor<typeof this>>) {
        return <BlogLayout>{page}</BlogLayout>
    }

    static title = "博客上传"
    textArea = React.createRef<HTMLTextAreaElement>();
    selection = React.createRef<HTMLDivElement>()

    render() {
        return (
            <div className={"h-full w-full flex flex-row divide-x divide-cyan-400"}>
                <div className={"grow px-4 flex h-full flex-col"}>
                    <div className={"flex flex-row w-full mb-4"}>
                        <div className={"w-16 shrink-0"} style={{lineHeight: "40px"}}>标题</div>
                        <Input placeholder="标题" aria-label={"标题"} fullWidth underlined maxLength={80}
                               value={this.state.title} onChange={e => this.setState({title: e.target.value})}/>
                    </div>
                    <div className={"flex flex-row w-full mb-4"}>
                        <div className={"w-16 shrink-0"} style={{lineHeight: "40px"}}>类型</div>
                        <Checkbox.Group
                            color="gradient"
                            orientation="horizontal"
                            size={'sm'}
                            defaultValue={[]}
                            className={"grow-1"}
                            ref={this.selection}
                            onChange={it => this.setState({selectedCategories: it})}
                        >
                            <div className="flex-wrap">
                                {
                                    this.state.categories.map(it => (
                                        <Checkbox value={it.id.toString()} key={it.id} className={"my-2"}>
                                            <span className={"whitespace-nowrap"}>{it.category}</span>
                                        </Checkbox>
                                    ))
                                }
                                <Input aria-label={"新增类型"} placeholder="新增类型" underlined maxLength={20}
                                       onKeyDown={this.tryAddNew.bind(this)}/>
                            </div>
                        </Checkbox.Group>
                    </div>
                    <div className={"flex flex-row w-full mb-4 grow-1 overflow-auto"} style={{colorScheme: "dark"}}>
                        <div className={"w-16 shrink-0"} style={{lineHeight: "40px"}}>正文</div>
                        <div className={"h-full w-full overflow-auto"}>
                            <Textarea
                                fullWidth
                                maxRows={Infinity}
                                ref={this.textArea}
                                value={this.state.content}
                                onChange={e => this.setState({content: e.target.value})}></Textarea>
                        </div>
                    </div>
                    <div className={"flex w-full mb-4 flex-row-reverse"}>
                        <Button shadow color="primary" auto ghost disabled={this.state.uploading}
                                onPress={this.uploadArticle.bind(this)}>
                            {this.state.uploading ? <Loading/> : "上传"}
                        </Button>
                    </div>
                </div>
                <div
                    className={"w-72 px-4 shrink-0"}
                    onDrop={this.uploadFile.bind(this)}
                    onDragOver={e => e.preventDefault()}
                >
                    {
                        this.state.files.map(t => <FileUploader file={t} key={t.name}
                                                                onClick={this.addImg.bind(this)}/>)
                    }
                </div>
            </div>
        )
    }

    componentDidMount() {
        this.getCategories()
    }

    private getCategories() {
        getCategory(1).then(({data}) => {
            this.setState({categories: data.data})
        })
    }

    tryAddNew(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.code === "Enter") {
            let currentTarget = e.currentTarget;
            if (currentTarget.value && currentTarget.value.length > 0) {
                addCategory(currentTarget.value,1).then(({data}) => {
                    this.state.categories.push(data.data)
                    this.setState({
                        categories: this.state.categories
                    })
                    currentTarget.value = ''
                })
            } else {
                AlertService.error("类型不能为空")
            }
        }
    }

    uploadFile(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault()
        this.setState({
            files: this.state.files.concat(Array.from(e.dataTransfer.files))
        })
    }

    addImg(name: string, url: string) {
        if (this.textArea.current) {
            const element = this.textArea.current as HTMLTextAreaElement
            this.setState({
                content: this.state.content.substring(0, element.selectionStart)
                    + `![${name}](${url})`
                    + this.state.content.substring(element.selectionStart)
            })
        }
    }

    uploadArticle() {
        uploadArticle({
            title: this.state.title,
            categories: this.state.selectedCategories.map(it => Number(it)),
            content: this.state.content
        })
    }
}
