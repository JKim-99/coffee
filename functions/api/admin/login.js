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

function constantTimeEqual(left, right) {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a[i % (a.length || 1)] || 0) ^ (b[i % (b.length || 1)] || 0);
  return diff === 0;
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: '올바른 요청이 아닙니다.' }, 400); }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const expectedPassword = env.ADMIN_PASSWORD || (new URL(request.url).hostname === 'localhost' || new URL(request.url).hostname === '127.0.0.1' ? 'admin1234' : '');

  if (!expectedPassword || username !== 'admin' || !constantTimeEqual(password, expectedPassword)) {
    return json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const sessionHash = base64Url(new Uint8Array(tokenHash));
  if (!env.DB) return json({ error: '관리자 세션 저장소를 사용할 수 없습니다.' }, 503);
  await env.DB.prepare(
    `INSERT INTO users (id, nickname, email, password_hash, gender, is_admin,
                        admin_session_hash, admin_session_expires_at)
     VALUES ('admin', '관리자', 'admin@localhost.invalid', 'managed-out-of-band', 'undisclosed', 1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET is_admin = 1, admin_session_hash = excluded.admin_session_hash,
                                   admin_session_expires_at = excluded.admin_session_expires_at,
                                   updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
  ).bind(sessionHash, new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()).run();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return json({ success: true }, 200, {
    'set-cookie': `compose_admin_session=${token}; Path=/; HttpOnly${secure}; SameSite=Strict; Max-Age=28800`
  });
}