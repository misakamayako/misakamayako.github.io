import {GetServerSideProps} from "next";
import axios from "axios";
import {GetStaticPropsContext} from "next/types";
import React from "react";
import {ArticleCategoryDTO} from "../../DTO";
import BlogLayout from "../../components/layout/BlogLayout";
import Form from "../../components/Form/Form";

interface Props {
    loginStatus: boolean
}

interface State {
    categories: Array<number>,
    fileUrl: string,
}

export const getServerSideProps: GetServerSideProps = async (context) => {
    try {
        await axios("//localhost/api/user/info", {
            headers: {
                Cookie: `user_session=${context.req.cookies.user_session}`
            }
        })
        return {props: {loginStatus: true}}
    } catch (e) {
        return {props: {loginStatus: false}}
    }
}
export default class Upload extends React.Component<Props, State> {
    state: State = {
        categories: [],
        fileUrl: ''
    }

    static getLayout(page: React.ReactElement<React.JSXElementConstructor<typeof this>>) {
        return <BlogLayout>{page}</BlogLayout>
    }

    static title = "博客上传"
    // <Form labelWidth={120}>
    // <Form.FormItem label={"123123123"}><input type="file" name={'file'}/></Form.FormItem>
// </Form>
    render() {
        return (
            <form action="/lastOrder/file/upload" method={"post"} encType="multipart/form-data">
                <input type="file" name={'file'} id={"a"}/>
                <input type="text" name={'file2'} id={'B'}/>
                <button>提交</button>
            </form>
        )
    }
}
