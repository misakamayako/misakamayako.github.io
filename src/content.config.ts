import {defineCollection} from "astro:content";
import {glob} from "astro/loaders";
import {z} from 'zod'

const blog = defineCollection({
    loader:glob({pattern:"*.md",base:"./src/content/blog"}),
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        pubDate: z.string(),
        description: z.string(),
        tags: z.array(z.string()).optional(),
        auth: z.string(),
        translated: z.boolean().optional(),
        translator: z.string().optional(),
        avatar: z.url().optional(),
        original_link: z.url().optional(),
        seriesId: z.string().optional(),
        seriesName: z.string().optional(),
        seriesOrder: z.number().int().optional(),
        deprecated: z.string().optional(),
        newVersionUrl: z.string().optional(),
    }),
});

/**
 * 与技术无关的随笔。
 * schema 刻意保持精简：不要求 auth，也没有 series / 翻译 / 废弃版本这些技术文章才需要的字段。
 * draft 为 true 时不参与列表与详情页的生成。
 */
const essay = defineCollection({
    loader: glob({pattern: "*.md", base: "./src/content/essay"}),
    schema: z.object({
        title: z.string(),
        slug: z.string(),
        pubDate: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        author: z.string().optional(),
        draft: z.boolean().optional(),
        // 随笔配图轮播：文件名相对 src/assets/essay/
        gallery: z.array(z.object({
            src: z.string(),
            alt: z.string().optional(),
        })).optional(),
    }),
});

export const collections = {
    blog,
    essay,
};
