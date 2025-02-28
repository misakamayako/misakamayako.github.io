import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import react from '@astrojs/react';
import { rehypeHeadingIds } from '@astrojs/markdown-remark';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  markdown: {
    rehypePlugins: [
      rehypeHeadingIds,
    ],
  },
  integrations: [sitemap(), react()],

  vite: {
    plugins: [tailwindcss()]
  }
});