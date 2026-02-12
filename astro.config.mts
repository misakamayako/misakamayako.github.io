import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react"
import {rehypeHeadingIds} from '@astrojs/markdown-remark';
import rehypeMermaid from 'rehype-mermaid';
import rehypePrettyCode from "rehype-pretty-code";

import tailwindcss from '@tailwindcss/vite';
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export default defineConfig({
    output: "static",
    prefetch: true,
    markdown: {
        syntaxHighlight: {
            type: 'shiki',
            excludeLangs: ['mermaid'],
        },
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
        remarkPlugins:[
            remarkMath
        ]
    },
    site: "https://misakamayako.github.io/",
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
