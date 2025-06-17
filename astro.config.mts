import {defineConfig} from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from "@astrojs/react"
import {rehypeHeadingIds} from '@astrojs/markdown-remark';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    output:"static",
    prefetch: true,
    markdown: {
        rehypePlugins: [
            rehypeHeadingIds,
        ],
    },
    site: "https://misakamayako.github.io/<repo-name>/",
    integrations: [
        // sitemap(),
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