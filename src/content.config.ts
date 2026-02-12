import {defineCollection, z} from "astro:content";
import {glob} from "astro/loaders";

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
        avatar: z.string().url().optional(),
        original_link: z.string().url().optional(),
        seriesId: z.string().optional(),
        seriesName: z.string().optional(),
        seriesOrder: z.number().int().optional(),
        deprecated: z.string().optional(),
        newVersionUrl: z.string().optional(),
    }),
});

export const collections = {
    blog,
};
