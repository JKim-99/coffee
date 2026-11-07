import { validNickname, validPassword } from '../../../lib/server/validation.js';
import { scrypt } from 'node:crypto';

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
  const saltText = base64Url(salt);
  const key = await new Promise((resolve, reject) => scrypt(password, saltText, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derivedKey) => error ? reject(error) : resolve(derivedKey)));
  return `scrypt$16384$8$1$${saltText}$${base64Url(key)}`;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: '사용자 데이터베이스가 설정되지 않았습니다.' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: '올바른 JSON 요청이 필요합니다.' }, 400); }

  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const gender = typeof body.gender === 'string' ? body.gender : '';
  if (!validNickname(nickname)) return json({ error: '닉네임은 2~30자의 글자·숫자·공백·마침표·밑줄·작은따옴표·하이픈으로 입력해 주세요.' }, 400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: '올바른 이메일 주소를 입력해 주세요.' }, 400);
  if (!validPassword(password)) return json({ error: '비밀번호는 8~128자이며 공백만으로 구성할 수 없습니다.' }, 400);
  if (!['female', 'male', 'undisclosed'].includes(gender)) return json({ error: '성별 항목을 선택해 주세요.' }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL').bind(email).first();
    if (existing) return json({ error: '이미 가입된 이메일 주소입니다.' }, 409);

    const passwordHash = await hashPassword(password);
    await env.DB.prepare(
      'INSERT INTO users (id, nickname, email, password_hash, gender, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, nickname, email, passwordHash, gender, now, now).run();

    return json({ user: { id, nickname, email, gender, created_at: now } }, 201);
  } catch (error) {
    const isDuplicate = String(error?.message || '').includes('UNIQUE constraint failed: users.email');
    if (isDuplicate) return json({ error: '이미 가입된 이메일 주소입니다.' }, 409);
    console.error('Signup operation failed', { name: error?.name || 'Error', message: String(error?.message || '').slice(0, 180) });
    return json({ error: '회원가입을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 500);
  }
}