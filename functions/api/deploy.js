/**
 * functions/api/deploy.js
 *
 * Cloudflare Pages Function — runs server-side at the edge.
 * Exposed as POST /api/deploy on the live site.
 *
 * WHY THIS EXISTS:
 * The live site is built + deployed by GitHub Actions (.github/workflows/
 * deploy.yml): it runs `npm run build` (which fetches fresh content from
 * Notion) and then `wrangler pages deploy`. That GitHub Actions run is the
 * ONLY pipeline that pulls new Notion posts onto wearewhole.co.
 *
 * So the publish button must trigger THAT workflow. This function calls the
 * GitHub API's workflow_dispatch endpoint server-side, authenticated with a
 * GITHUB_TOKEN secret (set in the Cloudflare Pages project → Settings →
 * Variables and secrets). Doing it server-side also avoids the CORS block
 * that stops the browser from calling GitHub directly.
 *
 * REQUIRED SECRET: GITHUB_TOKEN — a GitHub personal access token (classic)
 * with the `workflow` scope.
 */

const OWNER = 'l-sinreich';
const REPO = 'wearewhole-blog';
const WORKFLOW = 'deploy.yml';
const REF = 'main';

export async function onRequestPost({ env }) {
  if (!env.GITHUB_TOKEN) {
    return new Response(
      JSON.stringify({ ok: false, error: 'GITHUB_TOKEN not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'wearewhole-publish-button',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: REF }),
    });

    // GitHub returns 204 No Content on a successful dispatch.
    if (res.status === 204) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const detail = await res.text();
    return new Response(
      JSON.stringify({ ok: false, status: res.status, detail }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
