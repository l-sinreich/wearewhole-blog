# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at localhost:4321
npm run build    # Build to /dist/ (runs Notion fetch + image downloads)
npm run preview  # Preview built site locally
```

**Required env vars** (`.env`):
```
NOTION_API_KEY=<notion integration token>
NOTION_DATABASE_ID=<notion database ID from URL>
```

## Architecture

Static blog built with Astro that syncs from Notion at build time. Zero runtime — all posts are pre-rendered to HTML and served from Cloudflare Pages CDN.

**Data flow:**
```
Notion DB → src/lib/notion.ts (build-time) → Astro pages → /dist/ → Cloudflare Pages
```

`src/lib/notion.ts` is the **only** file that touches the Notion API. It fetches all published posts, converts Notion blocks to Markdown via `notion-to-md`, and downloads cover images to `dist/images/posts/` (not `public/` — images downloaded mid-build must go to `dist/` since `public/` is copied before build runs).

**Pages:**
- `blog/[...page].astro` — Paginated blog index (9 posts/page)
- `blog/[slug].astro` — Individual post (dynamic, generated via `getStaticPaths()`)
- `blog/category/[name].astro`, `blog/tag/[name].astro` — Generated but not linked in nav (functional, just dormant)
- `publish.astro` — Manual rebuild trigger (POSTs to `/api/deploy` Cloudflare Function → webhook)

**Markdown rendering** is hand-rolled regex in `PostLayout.astro` (no library). Handles nested lists, callouts (`> 🎉 text` → dark box), blockquotes, to-do items, code blocks, inline formatting.

## Key Conventions

**Notion data model** (`Post` interface in `notion.ts`):
- `Published` checkbox filters drafts at build time
- Slugs fall back to Notion page ID if the `Slug` property is empty
- Dates parsed with `T12:00:00` suffix to avoid UTC timezone shifts

**Styling**: Single `src/styles/global.css` (no Tailwind). CSS custom properties for design tokens (`--yellow`, `--dark-bg`, etc.). BEM-like class naming (`.post-card__title`).

**Notion SDK**: Uses v5 (`@notionhq/client` v5.9.0) — API uses `notion.dataSources.query()`, not the v4 `notion.databases.query()`.
