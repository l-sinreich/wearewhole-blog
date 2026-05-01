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

const WORKFLOW_URL =
  'https://api.github.com/repos/l-sinreich/wearewhole-blog/actions/workflows/deploy.yml/dispatches';

export async function onRequestPost(context) {
  const token = context.env.GITHUB_TOKEN;

  try {
    const res = await fetch(WORKFLOW_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    });

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await res.text();
    return new Response(JSON.stringify({ ok: false, status: res.status, body }), {
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
