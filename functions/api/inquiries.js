import { currentMember } from '../../lib/server/member.js';
import { missingInquiryOwnerColumn } from '../../lib/server/inquiry-schema.js';

const allowedTopics = new Set(['일반 문의', '메뉴 문의', '매장 이용 문의', '제휴 문의', '기타']);

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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function requireAdmin(request) {
  const email = request.headers.get('cf-access-authenticated-user-email');
  if (!email) return json({ error: '관리자 인증이 필요합니다.' }, 401);
  return null;
}

export async function onRequestGet({ env, request }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  if (!env.DB) return json({ error: '문의 데이터베이스가 설정되지 않았습니다.' }, 503);

  const url = new URL(request.url);
  const rawLimit = Number(url.searchParams.get('limit') || 50);
  const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;
  const { results } = await env.DB.prepare(
    'SELECT id, name, email, topic, subject, message, created_at, updated_at, deleted_at FROM inquiries WHERE deleted_at IS NULL ORDER BY created_at DESC, rowid DESC LIMIT ?'
  ).bind(limit).all();

  return json({ inquiries: results });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ error: '문의 데이터베이스가 설정되지 않았습니다.' }, 503);
  const user = await currentMember(request, env);
  if (!user) return json({ error: '문의 등록은 로그인 후 이용해 주세요.' }, 401);

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: '요청 본문은 올바른 JSON이어야 합니다.' }, 400);
  }

  const name = user.nickname;
  const email = user.email;
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || name.length > 60) return json({ error: '이름은 1~60자로 입력해 주세요.' }, 400);
  if (!isValidEmail(email)) return json({ error: '올바른 이메일 주소를 입력해 주세요.' }, 400);
  if (!allowedTopics.has(topic)) return json({ error: '문의 유형이 올바르지 않습니다.' }, 400);
  if (!subject || subject.length > 120) return json({ error: '문의 제목은 1~120자로 입력해 주세요.' }, 400);
  if (!message || message.length > 3000) return json({ error: '문의 내용은 1~3000자로 입력해 주세요.' }, 400);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  let ownerLinked = true;
  try {
    await env.DB.prepare(
      'INSERT INTO inquiries (id, name, email, topic, subject, message, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, name, email, topic, subject, message, createdAt, createdAt, user.id).run();
  } catch (error) {
    if (!missingInquiryOwnerColumn(error)) throw error;
    ownerLinked = false;
    console.warn('Inquiry ownership migration 0008 is pending; using authenticated email compatibility mode.');
    await env.DB.prepare(
      'INSERT INTO inquiries (id, name, email, topic, subject, message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, name, email, topic, subject, message, createdAt, createdAt).run();
  }

  return json({ inquiry: { id, name, email, topic, subject, message, created_at: createdAt, updated_at: createdAt, deleted_at: null, user_id: ownerLinked ? user.id : null } }, 201);
}

export async function onRequestPut({ env, request }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  if (!env.DB) return json({ error: '문의 데이터베이스가 설정되지 않았습니다.' }, 503);

  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 100) return json({ error: '수정할 문의 ID가 필요합니다.' }, 400);

  let body;
  try {
    body = await request.json();
  } catch (error) {
    return json({ error: '요청 본문은 올바른 JSON이어야 합니다.' }, 400);
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || name.length > 60) return json({ error: '이름은 1~60자로 입력해 주세요.' }, 400);
  if (!isValidEmail(email)) return json({ error: '올바른 이메일 주소를 입력해 주세요.' }, 400);
  if (!allowedTopics.has(topic)) return json({ error: '문의 유형이 올바르지 않습니다.' }, 400);
  if (!subject || subject.length > 120) return json({ error: '문의 제목은 1~120자로 입력해 주세요.' }, 400);
  if (!message || message.length > 3000) return json({ error: '문의 내용은 1~3000자로 입력해 주세요.' }, 400);

  const updatedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    'UPDATE inquiries SET name = ?, email = ?, topic = ?, subject = ?, message = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(name, email, topic, subject, message, updatedAt, id).run();
  if (!result.meta.changes) return json({ error: '수정할 문의 내역을 찾을 수 없습니다.' }, 404);

  return json({ success: true, updated_at: updatedAt });
}

export async function onRequestDelete({ env, request }) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;
  if (!env.DB) return json({ error: '문의 데이터베이스가 설정되지 않았습니다.' }, 503);

  const id = new URL(request.url).searchParams.get('id');
  if (!id || id.length > 100) return json({ error: '삭제할 문의 ID가 필요합니다.' }, 400);

  const deletedAt = new Date().toISOString();
  const result = await env.DB.prepare(
    'UPDATE inquiries SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL'
  ).bind(deletedAt, deletedAt, id).run();
  if (!result.meta.changes) return json({ error: '문의 내역을 찾을 수 없습니다.' }, 404);
  return json({ success: true, deleted_at: deletedAt });
}