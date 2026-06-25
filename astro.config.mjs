// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  // The full URL where this blog will live.
  // Astro uses this to generate canonical URLs and the sitemap.
  // Update this once your Cloudflare Pages domain is confirmed.
  site: 'https://wearewhole.co',

  // output: 'static' means Astro generates pure HTML files at build time.
  // There is no server — Cloudflare Pages just serves the files in /dist.
  // If you ever needed server-side logic (e.g. form handling), you'd switch
  // to 'server', but for a blog this is faster, cheaper, and simpler.
  output: 'static',

  integrations: [
    // Automatically generates /sitemap-index.xml and /sitemap-0.xml.
    // Search engines use this to discover all your pages.
    sitemap(),

    // MDX powers the living white paper: each section is an .mdx file in
    // src/content/whitepaper/, version-controlled in git so every edit is a
    // transparent, attributable diff. See src/content.config.ts for the schema.
    mdx(),
  ],
});
