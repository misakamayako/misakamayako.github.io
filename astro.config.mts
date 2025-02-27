import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // ...
  // ...
  integrations: [sitemap(), react()],

  vite: {
    plugins: [tailwindcss()]
  }
});