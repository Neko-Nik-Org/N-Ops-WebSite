// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://nops.app',
  // One URL per page, without a trailing slash: /pricing, /product/vault.
  // "file" builds pricing.html (not pricing/index.html), which Cloudflare serves at /pricing directly,
  // so internal links, canonicals and the sitemap all agree and nothing redirects.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      serialize: (item) => ({ ...item, lastmod: new Date().toISOString() }),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
