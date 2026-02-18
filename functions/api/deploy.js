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

export async function onRequestPost() {
  try {
    const res = await fetch(DEPLOY_HOOK_URL, { method: 'POST' });

    if (res.ok) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: false, status: res.status }), {
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
