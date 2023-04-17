import React from "react";
import {Badge, Button, Checkbox, Input, Loading} from "@nextui-org/react";

import {CategoryType} from "../../DTO/Category";
import Form from "../../components/Form/Form";
import AlertService from "../../utils/AlertService";
import Autocomplete from "../../components/Autocomplete/Autocomplete";
import {addCategory, getCategory} from "../../api/category";
import {uploadFile} from "../../api/file";
import URLWithStore from "../../utils/URLWithStore";
import {addImage} from "../../api/images";

interface State {
    imgUrl: string
    process: number
    selectedCategories: Array<{ value: number, text: string }>
    fileName: string
    categorySource: { value: number, text: string }[]
    loading: boolean
    nsfw: boolean
    private: boolean
}

export default class ImgUpload extends React.Component<any, State> {
    state: State = {
        imgUrl: "",
        process: 0,
        selectedCategories: [],
        fileName: "",
        categorySource: [],
        loading: false,
        nsfw: false,
        private: true
    }

    private async submitForm() {
        if (!this.state.imgUrl) {
            AlertService.error("请上传图片")
            return
        }
        if (!this.state.fileName) {
            AlertService.error("请输入图片名称")
            return
        }
        try {
            this.setState({loading: true})
            const fileObject = new FormData()
            fileObject.append("name", this.state.fileName)
            fileObject.append("file", URLWithStore.getFromObjectURL(this.state.imgUrl)!!)
            const uploadJobResult = await uploadFile(fileObject, process => {

            })
            const url = uploadJobResult.data.data
           await addImage({
                fileUrl: url,
               name: this.state.fileName,
                categories: this.state.selectedCategories.map(it => it.value),
                // album?: number;
                nsfw: false,
                private: false,
            })
            AlertService.info("操作成功")
        } catch (e) {
            this.setState({loading: !1})
        }
    }

    private removeCategory(id: number) {
        const index = this.state.selectedCategories.findIndex(it => it.value === id)
        if (index !== -1) {
            const selectedCategories = this.state.selectedCategories
            selectedCategories.splice(index, 1)
            this.setState({selectedCategories})
        }
    }

    private tryAddNew(category: string) {
        return addCategory(category, CategoryType.image).then(({data}) => {
            this.state.selectedCategories.push({value: data.data.id, text: data.data.category})
            this.setState({
                selectedCategories: this.state.selectedCategories
            })
        })
    }

    private findCategory(key: string) {
        if (key.length > 0) {
            return getCategory(2, key).then(({data}) => {
                this.setState({
                    categorySource: data.data.map(it => ({value: it.id, text: it.category}))
                })
            })
        }
    }

    render() {
        return (
            <div className={"w-full h-screen grid grid-cols-12"}>
                <div className={"col-span-8 h-full flex flex-col items-center justify-center"}
                     onDragOver={e => e.preventDefault()}
                     onDrop={this.onDrop.bind(this)}>
                    {
                        this.state.imgUrl ?
                            <img src={this.state.imgUrl} alt="" width={"100%"}/> :
                            <p className={"text-center"}>请将图片拖动到此处</p>
                    }
                </div>
                <div className={"col-span-4 h-full"}>
                    <Form labelWidth={80}>
                        <Form.FormItem label={"图片名称"}>
                            <Input value={this.state.fileName}
                                   css={{width: "100%"}}
                                   onChange={e => this.setState({fileName: e.target.value})}
                                   aria-label={"img name"}/>
                        </Form.FormItem>
                        <Form.FormItem label={"分类"}>
                            <Autocomplete
                                dataSource={this.state.categorySource}
                                onChange={this.findCategory.bind(this)}
                                onSelected={() => void 0}
                                onCreateNew={this.tryAddNew.bind(this)}
                            />
                        </Form.FormItem>
                        <Form.FormItem label={"已选分类"}>
                            {
                                this.state.selectedCategories.map(it => (
                                    <Badge
                                        color="primary"
                                        variant="bordered"
                                        key={it.value}
                                        className={"cursor-pointer"}
                                        onClick={this.removeCategory.bind(this, it.value)}
                                    >
                                        {it.text}
                                    </Badge>
                                ))
                            }
                        </Form.FormItem>
                        <Form.FormItem label={"所属相册"}>
                            todo
                        </Form.FormItem>
                        <Form.FormItem label={"其他配置"}>
                            <Checkbox isSelected={this.state.nsfw} onChange={nsfw => this.setState({nsfw})}
                                      label={"nsfw"}/>
                            <span>{" "}</span>
                            <Checkbox isSelected={this.state.private} onChange={a => this.setState({private: a})}
                                      label={"private"}/>
                        </Form.FormItem>
                        <Form.FormItem>
                            <Button color={"primary"} shadow disabled={this.state.loading}
                                    onClick={this.submitForm.bind(this)}>
                                {this.state.loading ? <Loading/> : null} 提交
                            </Button>
                        </Form.FormItem>
                    </Form>
                </div>
            </div>
        )
    }

    onDrop(e: React.DragEvent) {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (!file.type.includes("image")) {
            AlertService.error("所选文件不是图片，请重新选择")
            return
        }
        const prevUrl = this.state.imgUrl
        this.setState({
            imgUrl: URLWithStore.createObjectURL(file),
            fileName: file.name
        }, () => {
            if (prevUrl) {
                URLWithStore.revokeObjectURL(prevUrl)
            }
        })
    }
}
