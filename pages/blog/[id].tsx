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
import {useEffect, useState} from "react";


interface Props {
    mdxSource: MDXRemoteSerializeResult
}

export default function Article({mdxSource}: Props) {
    const [isSSR, setIsSSR] = useState(true);

    useEffect(() => {
        setIsSSR(false);
    }, []);
    return (
        <article className="prose dark:prose-invert px-4">
            {isSSR ? null : <MDXRemote {...mdxSource} />}
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

export async function getStaticProps(context: GetStaticPropsContext<{ id: string }>): Promise<GetStaticPropsResult<{ mdxSource: MDXRemoteSerializeResult }>> {
    const content = await getArticle(context.params!!.id)
    const mdxSource = await serialize(
        content.data.data.content,
        {
            mdxOptions: {
                remarkPlugins: [[remarkGfm, {stringLength: stringWidth}], remarkMath],
                rehypePlugins: [rehypeKatex, rehypeHighlight, remark_prism],
                format: 'md'
            },
        })
    return {props: {mdxSource}}
}
