/**
 * src/lib/notion.ts
 *
 * This is the ONLY file in the project that talks to Notion.
 * Every page (blog index, individual posts, category/tag pages) calls
 * getAllPosts() from here — they never touch the Notion API directly.
 *
 * Why centralize it? If Notion's API changes, or you want to swap in a
 * different CMS later, you only change this one file.
 *
 * This module runs at BUILD TIME only — not in the browser.
 * Astro runs this code on your machine (or in Cloudflare's build environment)
 * and bakes the results into static HTML. Users never see API calls.
 */

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Client setup
// ---------------------------------------------------------------------------

// import.meta.env is Astro's way of reading environment variables.
// These come from .env locally, and from Cloudflare Pages environment
// variables in production. They are NEVER exposed to the browser.
const notion = new Client({
  auth: import.meta.env.NOTION_API_KEY,
});

// notion-to-md converts Notion's block tree (paragraphs, headings, lists,
// code blocks, etc.) into Markdown. We then render that Markdown as HTML
// in the layout. This handles the full Notion content model.
const n2m = new NotionToMarkdown({ notionClient: notion });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A Post is everything we need to render any view of a blog post —
 * the card on the index page, the full post page, and the category/tag pages.
 */
export interface Post {
  id: string;           // Notion page ID (used as a fallback slug)
  title: string;        // The post headline
  slug: string;         // URL-friendly identifier, e.g. "boulder-startup-week"
  date: string;         // ISO date string, e.g. "2026-02-17"
  excerpt: string;      // Short summary for post cards
  category: string;     // Single category name (empty string if not set)
  tags: string[];       // Array of tag names (empty array if none)
  coverImage: string | null; // Local path like /images/posts/slug.jpg, or null
  body: string;         // Full post content as a Markdown string
}

// ---------------------------------------------------------------------------
// Image handling
// ---------------------------------------------------------------------------

/**
 * downloadImage fetches a public image URL and saves it to public/images/posts/.
 * Astro copies everything in public/ into dist/ at build time, so the image
 * ends up on Cloudflare's CDN automatically — no image hosting service needed.
 *
 * Why download instead of using the URL directly?
 * If the URL ever becomes unavailable (e.g. the source site goes down), the
 * blog would show broken images. By bundling images into the build, the blog
 * is fully self-contained and never depends on external hosts.
 *
 * Returns the local path (/images/posts/slug.jpg) or null if download fails.
 */
async function downloadImage(url: string, slug: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    // Detect image format from Content-Type header.
    // We default to .jpg for everything that isn't explicitly PNG.
    const contentType = res.headers.get('content-type') ?? '';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const filename = `${slug}.${ext}`;

    // WHY dist/ instead of public/?
    // downloadImage() runs mid-build, AFTER Astro has already scanned and
    // copied the public/ directory into dist/. Writing to public/ at that
    // point is too late — Astro won't pick up the new files for this build.
    // Writing directly to dist/ works because Astro leaves existing files in
    // dist/ alone; it only overwrites the HTML/JS/CSS it generates itself.
    const dir = 'dist/images/posts';
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const buffer = Buffer.from(await res.arrayBuffer());
    writeFileSync(path.join(dir, filename), buffer);

    // Return the PUBLIC URL path (not the filesystem path).
    // This is what goes into the <img src="..."> in the HTML.
    return `/images/posts/${filename}`;
  } catch (err) {
    // If the download fails for any reason, we log a warning and continue.
    // A missing image is better than a failed build.
    console.warn(`[notion] Failed to download cover image for "${slug}":`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main data fetch
// ---------------------------------------------------------------------------

/**
 * getAllPosts queries the Notion database and returns all published posts,
 * sorted newest-first, with their content converted to Markdown.
 *
 * This is called at build time by every page that needs post data.
 * Astro is smart enough to only call it once per build even if multiple
 * pages import it — but if you want to be explicit about that, you could
 * add a module-level cache (not needed for a small blog).
 */
export async function getAllPosts(): Promise<Post[]> {
  // NOTE: In @notionhq/client v5, database querying moved:
  //   v2/v3: notion.databases.query({ database_id: '...' })
  //   v5:    notion.dataSources.query({ data_source_id: '...' })
  //
  // The filter/sort syntax is unchanged — only the namespace and param name differ.
  // If this breaks after a future SDK upgrade, check here first.
  const response = await notion.dataSources.query({
    data_source_id: import.meta.env.NOTION_DATABASE_ID,

    // Only fetch posts where the Published checkbox is checked.
    // Unchecked = draft. Drafts are completely invisible to the build.
    filter: {
      property: 'Published',
      checkbox: { equals: true },
    },

    // Sort newest-first. You can change this to 'ascending' for oldest-first.
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  // Process all posts concurrently using Promise.all.
  // Why concurrent? Each post requires two Notion API calls (page properties
  // + block content) plus a potential image download. Doing them in parallel
  // cuts build time dramatically as the post count grows.
  const posts = await Promise.all(
    response.results.map(async (page: any) => {
      const props = page.properties;

      // Every property access uses ?. on the property object itself first.
      // This guards against a property being renamed or missing from a page —
      // e.g. if someone adds a post before all columns are created in Notion.
      // Without this, `props.Slug.rich_text` throws if props.Slug is undefined.
      const slug = props.Slug?.rich_text?.[0]?.plain_text ?? page.id;

      // Convert the full Notion page content (all blocks) to Markdown.
      // .parent can be undefined if the page has no body content — guard with ?? ''.
      const mdBlocks = await n2m.pageToMarkdown(page.id);
      const body = n2m.toMarkdownString(mdBlocks).parent ?? '';

      // Cover image: URL-type field in Notion (not rich_text — URL fields expose
      // the value directly as .url, not via .rich_text[0].plain_text).
      const imageUrl = props['Cover Image']?.url ?? null;
      const coverImage = imageUrl ? await downloadImage(imageUrl, slug) : null;

      return {
        id: page.id,
        title: props.Title?.title?.[0]?.plain_text ?? '',
        slug,
        date: props.Date?.date?.start ?? '',
        excerpt: props.Excerpt?.rich_text?.[0]?.plain_text ?? '',
        category: props.Category?.select?.name ?? '',
        tags: props.Tags?.multi_select?.map((t: any) => t.name) ?? [],
        coverImage,
        body,
      } satisfies Post;
      // `satisfies Post` is a TypeScript 4.9+ feature that validates the object
      // shape against the Post interface at compile time, without widening the type.
    })
  );

  return posts;
}
