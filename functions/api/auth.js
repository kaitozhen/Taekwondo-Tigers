/**
 * Cloudflare Pages Function — GitHub OAuth für Decap CMS
 * Datei: functions/api/auth.js
 *
 * Umgebungsvariablen in Cloudflare Pages setzen:
 *   GITHUB_CLIENT_ID     → aus der GitHub OAuth App
 *   GITHUB_CLIENT_SECRET → aus der GitHub OAuth App
 */

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  // ── Schritt 1: Weiterleitung zu GitHub ──────────────────────────────
  if (!code) {
    const params = new URLSearchParams({
      client_id:    env.GITHUB_CLIENT_ID,
      scope:        "repo,user",
      redirect_uri: `${url.origin}/api/auth`,
    });
    return Response.redirect(
      `https://github.com/login/oauth/authorize?${params}`,
      302
    );
  }

  // ── Schritt 2: Code gegen Access Token tauschen ──────────────────────
  let token;
  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":       "application/json",
      },
      body: JSON.stringify({
        client_id:     env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    token = data.access_token;
  } catch (err) {
    return new Response(`OAuth Fehler: ${err.message}`, { status: 500 });
  }

  // ── Schritt 3: Token an Decap CMS zurückgeben ────────────────────────
  // Decap CMS erwartet eine postMessage vom Popup-Fenster
  const html = `<!DOCTYPE html><html><body><script>
    (function() {
      const msg = JSON.stringify({
        token:    ${JSON.stringify(token)},
        provider: "github"
      });
      // Nachricht an das öffnende Fenster (Decap CMS)
      function send(e) {
        window.opener.postMessage("authorization:github:success:" + msg, e.origin);
      }
      window.addEventListener("message", send, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  <\/script></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
