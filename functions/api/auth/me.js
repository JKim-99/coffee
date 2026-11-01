function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers }
  });
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function onRequestGet({ request, env }) {
  const rawCookie = request.headers.get('cookie') || '';
  const sessionToken = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('compose_session='))?.slice('compose_session='.length);
  if (!sessionToken || !env.DB) return json({ error: '로그인이 필요합니다.' }, 401);
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken));
  const sessionId = base64Url(new Uint8Array(hash));
  const user = await env.DB.prepare(
    `SELECT id, nickname, email, gender, created_at FROM users
     WHERE session_token_hash = ? AND session_expires_at > ? AND deleted_at IS NULL`
  ).bind(sessionId, new Date().toISOString()).first();
  if (!user) {
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return json({ error: '로그인이 만료되었습니다.' }, 401, { 'set-cookie': `compose_session=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0` });
  }
  return json({ user });
}

export async function onRequestDelete({ request, env }) {
  const rawCookie = request.headers.get('cookie') || '';
  const sessionToken = rawCookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('compose_session='))?.slice('compose_session='.length);
  if (sessionToken && env.DB) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken));
    const sessionId = base64Url(new Uint8Array(hash));
    await env.DB.prepare('UPDATE users SET session_token_hash = NULL, session_expires_at = NULL, updated_at = ? WHERE session_token_hash = ?')
      .bind(new Date().toISOString(), sessionId).run();
  }
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return json({ success: true }, 200, { 'set-cookie': `compose_session=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0` });
}