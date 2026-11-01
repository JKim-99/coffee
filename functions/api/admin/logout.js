function json(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function onRequestPost({ request, env }) {
  const token = (request.headers.get('cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('compose_admin_session='))?.slice('compose_admin_session='.length);
  if (token && env.DB) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    await env.DB.prepare('UPDATE users SET admin_session_hash = NULL, admin_session_expires_at = NULL WHERE id = ? AND admin_session_hash = ?')
      .bind('admin', base64Url(new Uint8Array(digest))).run();
  }
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return json({ success: true }, 200, {
    'set-cookie': `compose_admin_session=; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=0`
  });
}