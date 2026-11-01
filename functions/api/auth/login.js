function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      ...headers
    }
  });
}

function base64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function verifyPassword(password, encoded) {
  const [algorithm, iterationsText, saltText, expected] = String(encoded).split('$');
  const iterations = Number(iterationsText);
  if (algorithm !== 'pbkdf2-sha256' || !Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;
  const salt = Uint8Array.from(atob(saltText.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return base64Url(new Uint8Array(bits)) === expected;
}

function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '사용자 데이터베이스가 설정되지 않았습니다.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: '올바른 JSON 요청이 필요합니다.' }, 400); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128) {
    return json({ error: '이메일 또는 비밀번호를 확인해 주세요.' }, 400);
  }

  const user = await env.DB.prepare(
    'SELECT id, nickname, email, gender, password_hash FROM users WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL'
  ).bind(email).first();
  if (!user || !(await verifyPassword(password, user.password_hash))) return json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }, 401);

  const sessionToken = token();
  const sessionHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sessionToken));
  const sessionId = base64Url(new Uint8Array(sessionHash));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare('UPDATE users SET session_token_hash = ?, session_expires_at = ?, updated_at = ? WHERE id = ?')
    .bind(sessionId, expiresAt, now.toISOString(), user.id).run();

  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return json({ user: { id: user.id, nickname: user.nickname, email: user.email, gender: user.gender } }, 200, {
    'set-cookie': `compose_session=${sessionToken}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=604800`
  });
}