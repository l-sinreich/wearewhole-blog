/**
 * functions/api/deploy.js
 *
 * Cloudflare Pages Function — runs server-side at the edge.
 * Exposed as POST /api/deploy on the live site.
 *
 * WHY THIS EXISTS:
 * The Cloudflare deploy hook lives at api.cloudflare.com, which does not
 * send Access-Control-Allow-Origin headers. Any browser fetch() to that
 * URL is blocked by CORS — the browser never sees the response.
 *
 * This function acts as a same-domain proxy: the browser calls /api/deploy
 * (no CORS issue), and this function calls the hook server-side (CORS
 * restrictions don't apply to server-to-server requests).
 */

const DEPLOY_HOOK_URL =
  'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/57892c34-26d2-44fe-923e-0932da06e61a';

const WORKFLOW_URL =
  'https://api.github.com/repos/l-sinreich/wearewhole-blog/actions/workflows/deploy.yml/dispatches';

export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;

  try {
    // Fire both in parallel — Cloudflare hook updates wearewhole-blog.pages.dev,
    // GitHub Actions updates wearewhole.co
    const [hookRes, ghRes] = await Promise.all([
      fetch(DEPLOY_HOOK_URL, { method: 'POST' }),
      token
        ? fetch(WORKFLOW_URL, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github+json',
              'Content-Type': 'application/json',
              'User-Agent': 'wearewhole-blog-publisher',
            },
            body: JSON.stringify({ ref: 'main' }),
          })
        : Promise.resolve({ ok: false, status: 0 }),
    ]);

    if (hookRes.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await hookRes.text();
    return new Response(JSON.stringify({ ok: false, status: hookRes.status, body }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
