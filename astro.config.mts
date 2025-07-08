import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react"
import {rehypeHeadingIds} from '@astrojs/markdown-remark';
import rehypeMermaid from 'rehype-mermaid';

import tailwindcss from '@tailwindcss/vite';

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
            ]
        ],
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
