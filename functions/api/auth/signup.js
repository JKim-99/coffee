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

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 210000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2-sha256$210000$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '사용자 데이터베이스가 설정되지 않았습니다.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: '올바른 JSON 요청이 필요합니다.' }, 400); }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const gender = typeof body.gender === 'string' ? body.gender : '';
  if (nickname.length < 2 || nickname.length > 30) return json({ error: '닉네임은 2~30자로 입력해 주세요.' }, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: '올바른 이메일 주소를 입력해 주세요.' }, 400);
  if (password.length < 8 || password.length > 128) return json({ error: '비밀번호는 8~128자로 입력해 주세요.' }, 400);
  if (!['female', 'male', 'undisclosed'].includes(gender)) return json({ error: '성별 항목을 선택해 주세요.' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL').bind(email).first();
  if (existing) return json({ error: '이미 가입된 이메일 주소입니다.' }, 409);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await hashPassword(password);
  await env.DB.prepare(
    'INSERT INTO users (id, nickname, email, password_hash, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, nickname, email, passwordHash, gender, now, now).run();

  return json({ user: { id, nickname, email, gender, created_at: now } }, 201);
}