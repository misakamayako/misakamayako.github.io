import type { APIRoute } from "astro";
import {getCollection, type InferEntrySchema} from "astro:content";


export const GET: APIRoute = async ({ url }) => {
    const tag = (url.searchParams.get("tag") ?? "").trim();

    const posts = await getCollection("blog") as InferEntrySchema<"blog">[];
    let items = posts.map((post) => ({
        slug: post.data.slug,
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        tags: post.data.tags ?? [],
    }));

    if (tag) {
        items = items.filter((item) => item.tags.includes(tag));
    }

    return new Response(JSON.stringify(items), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
};
