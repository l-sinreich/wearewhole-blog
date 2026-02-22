# wearewhole-blog

Static blog built with Astro, sourced from Notion, deployed to Cloudflare Pages.

## Editing content

All posts live in Notion. To write or update a post:

1. Open the Notion database
2. Write/edit your post
3. Check the **Published** checkbox when ready
4. Trigger a deploy (see below)

Drafts (unchecked Published) are never fetched or rendered.

## Publishing (triggering a deploy)

There are three ways to rebuild and deploy the site:

### 1. Push to `main` (code changes)
Any commit pushed to `main` automatically triggers a full rebuild via GitHub Actions. The build fetches all published posts from Notion and deploys to Cloudflare Pages.

### 2. Publish button (content-only updates)
For Notion-only changes (no code touched), use the publish page:

**`https://wearewhole.co/publish/`**

Click **Trigger Rebuild**. The site rebuilds in ~30 seconds.

### 3. GitHub Actions — manual trigger
From the [Actions tab](https://github.com/l-sinreich/wearewhole-blog/actions), select **Deploy** → **Run workflow** → **Run workflow**. Useful if the publish button isn't handy.

## Local dev

```bash
cp .env.example .env   # add NOTION_API_KEY + NOTION_DATABASE_ID
npm install
npm run dev            # localhost:4321
```

**Required env vars:**

| Var | Source |
|-----|--------|
| `NOTION_API_KEY` | notion.so/my-integrations |
| `NOTION_DATABASE_ID` | Notion database URL |

```bash
npm run build    # full build (fetches Notion, downloads images)
npm run preview  # preview built site
```
