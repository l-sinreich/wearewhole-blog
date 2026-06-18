/**
 * functions/api/deploy.js
 *
 * Cloudflare Pages Function — runs server-side at the edge.
 * Exposed as POST /api/deploy on the live site.
 *
 * WHY THIS EXISTS:
 * The publish button must refresh BOTH deploy targets:
 *   - Cloudflare deploy hook  → rebuilds wearewhole-blog.pages.dev (the preview)
 *   - GitHub Actions workflow → rebuilds wearewhole.co (production; this is the
 *     only pipeline that runs `npm run build`, i.e. the Notion fetch)
 *
 * Both are fired server-side: the Cloudflare hook (api.cloudflare.com) and the
 * GitHub API both lack CORS headers, so a direct browser fetch would be blocked.
 *
 * Success requires the GitHub dispatch to succeed — that's the one that updates
 * production. A green button that only fired the preview hook would hide exactly
 * the failure mode this endpoint exists to prevent.
 *
 * REQUIRED SECRET: GITHUB_TOKEN — token with permission to dispatch deploy.yml.
 */

const DEPLOY_HOOK_URL =
  'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/57892c34-26d2-44fe-923e-0932da06e61a';

const WORKFLOW_URL =
  'https://api.github.com/repos/l-sinreich/wearewhole-blog/actions/workflows/deploy.yml/dispatches';

export async function onRequestPost({ env }) {
  const token = env.GITHUB_TOKEN;

  if (!token) {
    return new Response(
      JSON.stringify({ ok: false, error: 'GITHUB_TOKEN not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Fire both in parallel — preview (hook) and production (GitHub Actions).
    const [hookRes, ghRes] = await Promise.all([
      fetch(DEPLOY_HOOK_URL, { method: 'POST' }),
      fetch(WORKFLOW_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'wearewhole-blog-publisher',
        },
        body: JSON.stringify({ ref: 'main' }),
      }),
    ]);

    // GitHub returns 204 on a successful workflow dispatch.
    const ghOk = ghRes.status === 204;

    if (hookRes.ok && ghOk) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Surface whichever target failed so the button shows a real error.
    const detail = {
      hook: hookRes.ok ? 'ok' : `failed (${hookRes.status})`,
      github: ghOk ? 'ok' : `failed (${ghRes.status}): ${await ghRes.text()}`,
    };
    return new Response(JSON.stringify({ ok: false, detail }), {
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
