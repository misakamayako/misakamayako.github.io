import {serialize} from 'next-mdx-remote/serialize'
import {MDXRemote, MDXRemoteSerializeResult} from 'next-mdx-remote'
import rehypeHighlight from "rehype-highlight";
// @ts-ignore
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
// @ts-ignore
import remarkGfm from 'remark-gfm'
// @ts-ignore
import remark_prism from "remark-prism";
// @ts-ignore
import stringWidth from 'string-width'
import BlogLayout from "../../components/layout/BlogLayout";
import {getAllArticle, getArticle} from "../../api/article";
import {GetStaticPropsContext, GetStaticPropsResult} from "next/types";
import React, {useEffect, useState} from "react";
import {ArticleDetailDTO} from "../../DTO/ArticleDTO";
import {Badge} from "@nextui-org/react";


interface Props {
    mdxSource: MDXRemoteSerializeResult,
    content:ArticleDetailDTO,
}

export default function Article({mdxSource,content}: Props) {
    const [isSSR, setIsSSR] = useState(true);

    useEffect(() => {
        setIsSSR(false);
        document.title = `✨御坂网络-${content.title}✨`
    }, []);
    return (
        <article className="prose dark:prose-invert px-4">
            <h1>{content.title}</h1>
            {isSSR ? null : <MDXRemote {...mdxSource} />}
            <hr/>
            <div className={"px-2 py-4"}>
                {
                    content.categories.map(category=>(
                        <Badge color="secondary" className={"ml-2"} variant="bordered" key={category.id}>
                            {category.category}
                        </Badge>
                    ))
                }
            </div>
        </article>
    )
}
Article.getLayout = function getLayout(page: ReturnType<typeof Article>) {
    return <BlogLayout>{page}</BlogLayout>
}

export async function getStaticPaths() {
    const ids = await getAllArticle()
    return {
        paths: ids.data.data.map(t => ({params: {id: t.id.toString()}})),
        fallback: false
    }
}

export async function getStaticProps(context: GetStaticPropsContext<{ id: string }>): Promise<GetStaticPropsResult<Props>> {
    let content:ArticleDetailDTO = (await getArticle(context.params!!.id)).data.data
    const mdxSource = await serialize(
        content.content,
        {
            mdxOptions: {
                remarkPlugins: [[remarkGfm, {stringLength: stringWidth}], remarkMath],
                rehypePlugins: [rehypeKatex, rehypeHighlight, remark_prism],
                format: 'md'
            },
        })
    return {props: {mdxSource,content}}
}
