import React from "react";
import {getArticleList} from "../../api/article";
import BlogLayout from "../../components/layout/BlogLayout";
import {Badge, Loading, Pagination} from "@heroui/react";
import Link from "next/link";
import {NextPageContext} from "next";
import {ArticleDTO} from "../../DTO/ArticleDTO";

interface PageData {
    page: number,
    pageSize:number,
    total: number,
    briefs: ArticleDTO[],
    searchText: string
    category: string,
    loading: boolean
}

export default class BlogIndex extends React.Component<{ category?: string }, PageData> {
    state: PageData = {
        page: 1,
        pageSize:5,
        total: 0,
        briefs: [],
        searchText: '',
        category: '',
        loading: false
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
                            this.state.loading ?
                                <Loading type={"gradient"} size={"xl"}/>
                                : this.state.briefs.map(it => (
                                    <Link href={'/blog/' + it.id} key={it.id}>
                                        <div className="block border rounded-lg mb-6 text-white cursor-pointer">
                                            <div className="py-4 px-6">{it.title}</div>
                                            <hr/>
                                            <div className="px-6 py-4">
                                                {it.brief}
                                            </div>
                                            <hr/>
                                            <div className="py-4 px-2">
                                                {
                                                    it.categories?.map(category => (
                                                        <Badge color="secondary" className={"ml-2"} variant="bordered"
                                                               key={category.id}>
                                                            {category.category}
                                                        </Badge>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </Link>
                                ))
                        }
                    </div>
                    <Pagination
                        shadow
                        noMargin
                        total={Math.ceil(state.total / state.pageSize)}
                        page={state.page}
                        onChange={this.pullData.bind(this)}
                        className={"my-1 ml-4"}
                    />
                </div>
            </div>
        )
    }

    pullData(page: number = 1) {
        this.setState({
            loading: true
        })
        getArticleList(page, this.state.pageSize,this.props.category).then(({data}) => {
            this.setState({
                page,
                total: data.data.total,
                briefs: data.data.data.map(t => ({
                    ...t,
                    brief: t.brief
                }))
            })
        }).finally(() => {
            this.setState({
                loading: false
            })
        })
    }

    componentDidMount() {
        this.pullData()
    }

    componentDidUpdate(prevProps: Readonly<{ category?: string }>) {
        if (this.props.category !== prevProps.category) {
            this.setState({
                category: this.props.category ?? ""
            })
            this.pullData()
        }
    }
}
