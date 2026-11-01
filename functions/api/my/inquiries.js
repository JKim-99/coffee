function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function currentUser(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const token = cookie.split(';').map((part) => part.trim())
    .find((part) => part.startsWith('compose_session='))?.slice('compose_session='.length);
  if (!token || !env.DB) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = base64Url(new Uint8Array(digest));
  return env.DB.prepare(
    'SELECT id, email FROM users WHERE session_token_hash = ? AND session_expires_at > ? AND deleted_at IS NULL'
  ).bind(hash, new Date().toISOString()).first();
}

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: '문의 내역을 확인하려면 로그인해 주세요.' }, 401);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    const inquiry = await env.DB.prepare(
      `SELECT id, topic, subject, message, created_at, updated_at
       FROM inquiries WHERE id = ? AND email = ? COLLATE NOCASE AND deleted_at IS NULL`
    ).bind(id, user.email).first();
    if (!inquiry) return json({ error: '문의 내역을 찾을 수 없습니다.' }, 404);
    return json({ inquiry });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, topic, subject, created_at, updated_at
     FROM inquiries WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL
     ORDER BY created_at DESC, rowid DESC LIMIT 100`
  ).bind(user.email).all();
  return json({ inquiries: results });
}