import {ArticleBriefDTO} from "../../DTO";
import React from "react";
import {getArticleList} from "../../api/article";
import BlogLayout from "../../components/layout/BlogLayout";
import {Pagination} from "@nextui-org/react";
import Link from "next/link";
import {NextPageContext} from "next";

interface PageData {
    page: number,
    total: number,
    briefs: ArticleBriefDTO[],
    searchText: string
    category: string
}

export default class BlogIndex extends React.Component<{ category?: string }, PageData> {
    state: PageData = {
        page: 1,
        total: 0,
        briefs: [],
        searchText: '',
        category: ''
    }

    static async getInitialProps(ctx: NextPageContext) {
        return ctx.query ?? {}
    }

    static getLayout(page: React.ReactElement<React.JSXElementConstructor<BlogIndex>>) {
        return <BlogLayout>{page}</BlogLayout>
    }

    render() {
        const state = this.state
        return (
            <div className="h-full flex flex-row">
                <div className="grow text-white flex flex-col">
                    <div className="flex-grow overflow-y-auto px-4">
                        {
                            state.briefs.map(i => (
                                <Link href={'/blog/' + i.id} key={i.id}>
                                    <div className="block border rounded-lg mb-6 text-white cursor-pointer">
                                        <div className="py-4 px-6">{i.title}</div>
                                        <hr/>
                                        <div className="px-6 py-4">
                                            {i.brief}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        }
                    </div>
                    <Pagination
                        shadow
                        noMargin
                        total={Math.ceil(state.total / 10)}
                        page={state.page}
                        onChange={this.pullData.bind(this)}
                        className={"my-1 ml-4"}
                    />
                </div>
            </div>
        )
    }

    pullData(page: number = 1) {
        getArticleList(page).then(({data}) => {
            this.setState({
                page,
                total: data.data.total,
                briefs: data.data.data.map(t => ({
                    ...t,
                    brief: t.brief
                }))
            })
        })
    }

    componentDidMount() {
        this.pullData()
    }

    componentDidUpdate(prevProps: Readonly<{ category?: string }>) {
        if (this.props.category !== prevProps.category) {
            this.setState({
                category: this.props?.category ?? ""
            }, () => {
                this.pullData()
            })
        }
    }
}
