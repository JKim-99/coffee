import { currentMember } from '../../../lib/server/member.js';
import { missingInquiryOwnerColumn } from '../../../lib/server/inquiry-schema.js';

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

export async function onRequestGet({ request, env }) {
  const user = await currentMember(request, env);
  if (!user) return json({ error: '문의 내역을 확인하려면 로그인해 주세요.' }, 401);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    let inquiry;
    try {
      inquiry = await env.DB.prepare(
        `SELECT id, topic, subject, message, reply, replied_at, created_at, updated_at
         FROM inquiries WHERE id = ? AND (user_id = ? OR (user_id IS NULL AND email = ? COLLATE NOCASE)) AND deleted_at IS NULL`
      ).bind(id, user.id, user.email).first();
    } catch (error) {
      if (!missingInquiryOwnerColumn(error)) throw error;
      inquiry = await env.DB.prepare(
        `SELECT id, topic, subject, message, reply, replied_at, created_at, updated_at
         FROM inquiries WHERE id = ? AND email = ? COLLATE NOCASE AND deleted_at IS NULL`
      ).bind(id, user.email).first();
    }
    if (!inquiry) return json({ error: '문의 내역을 찾을 수 없습니다.' }, 404);
    return json({ inquiry });
  }

  let rows;
  try {
    rows = await env.DB.prepare(
      `SELECT id, topic, subject, replied_at, created_at, updated_at
       FROM inquiries WHERE (user_id = ? OR (user_id IS NULL AND email = ? COLLATE NOCASE)) AND deleted_at IS NULL
       ORDER BY created_at DESC, rowid DESC LIMIT 100`
    ).bind(user.id, user.email).all();
  } catch (error) {
    if (!missingInquiryOwnerColumn(error)) throw error;
    rows = await env.DB.prepare(
      `SELECT id, topic, subject, replied_at, created_at, updated_at
       FROM inquiries WHERE email = ? COLLATE NOCASE AND deleted_at IS NULL
       ORDER BY created_at DESC, rowid DESC LIMIT 100`
    ).bind(user.email).all();
  }
  return json({ inquiries: rows.results });
}