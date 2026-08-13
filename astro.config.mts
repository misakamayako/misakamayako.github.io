import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react"
import node from "@astrojs/node";
import {rehypeHeadingIds, unified} from '@astrojs/markdown-remark';
import rehypeMermaid from 'rehype-mermaid';
import rehypePrettyCode from "rehype-pretty-code";
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const site = process.env.SITE_URL ?? env.SITE_URL ?? 'https://misakamayako.github.io/';

export default defineConfig({
    adapter: node({mode: "standalone"}),
    output: "static",
    prefetch: true,
    markdown: {
        syntaxHighlight: {
            type: 'shiki',
            excludeLangs: ['mermaid'],
        },
        processor: unified({
            rehypePlugins: [
                rehypeHeadingIds,
                [
                    rehypeMermaid,
                    {
                        mermaidConfig: {
                            theme: "dark"
                        }
                    }
                ],
                rehypePrettyCode,
                rehypeKatex
            ],
            remarkPlugins: [
                remarkMath
            ]
        })
    },
    site,
    base: "/",
    trailingSlash: "always",
    integrations: [
        sitemap(),
        react()
    ],

    vite: {
        plugins: [tailwindcss()],
        css: {
            transformer: "lightningcss"
        },
        build: {
            cssMinify: 'lightningcss'
        }
    }
});
