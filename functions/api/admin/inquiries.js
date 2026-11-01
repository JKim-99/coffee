function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
  });
}

async function requireAdmin(request, env) {
  const token = (request.headers.get('cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('compose_admin_session='))?.slice('compose_admin_session='.length);
  if (!token || !env.DB) return false;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  let binary = '';
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  const hash = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  const session = await env.DB.prepare(
    'SELECT id FROM users WHERE id = ? AND is_admin = 1 AND admin_session_hash = ? AND admin_session_expires_at > ?'
  ).bind('admin', hash, new Date().toISOString()).first();
  return Boolean(session);
}

async function sendReplyNotification(env, to, requestUrl) {
  if (!env.EMAIL || !env.EMAIL_FROM) return { status: 'not_configured', error: 'Email Sending domain/binding is not configured' };
  try {
    await env.EMAIL.send({
      from: env.EMAIL_FROM,
      to,
      subject: '문의 답변 작성이 완료되었습니다',
      text: `문의하신 내용에 답변이 등록되었습니다. 답변 내용은 이메일에 포함하지 않았습니다.\n문의 확인: ${new URL('/inquiries.html', requestUrl).href}`
    });
    return { status: 'sent', error: null };
  } catch (error) {
    console.error('Inquiry notification email failed', { name: error?.name || 'Error' });
    return { status: 'failed', error: 'Email delivery failed' };
  }
}

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: '관리자 로그인이 필요합니다.' }, 401);
  if (!env.DB) return json({ error: '문의 데이터베이스가 설정되지 않았습니다.' }, 503);
  const { results } = await env.DB.prepare(
    `SELECT id, name, email, topic, subject, message, reply, email_status, email_error,
            created_at, updated_at, replied_at
     FROM inquiries WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`
  ).all();
  return json({ inquiries: results });
}

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: '관리자 로그인이 필요합니다.' }, 401);
  if (!env.DB) return json({ error: '문의 데이터베이스가 설정되지 않았습니다.' }, 503);
  const id = new URL(request.url).searchParams.get('id');
  let body;
  try { body = await request.json(); } catch { return json({ error: '올바른 요청이 아닙니다.' }, 400); }
  const reply = typeof body.reply === 'string' ? body.reply.trim() : '';
  if (!id || id.length > 100) return json({ error: '문의 ID가 필요합니다.' }, 400);
  if (!reply || reply.length > 5000) return json({ error: '답변은 1~5000자로 입력해 주세요.' }, 400);

  const inquiry = await env.DB.prepare('SELECT id, email FROM inquiries WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!inquiry) return json({ error: '문의 내역을 찾을 수 없습니다.' }, 404);

  const repliedAt = new Date().toISOString();
  const { status: emailStatus, error: emailError } = await sendReplyNotification(env, inquiry.email, request.url);

  await env.DB.prepare(
    'UPDATE inquiries SET reply = ?, replied_at = ?, updated_at = ?, email_status = ?, email_error = ? WHERE id = ?'
  ).bind(reply, repliedAt, repliedAt, emailStatus, emailError, id).run();
  return json({ success: true, replied_at: repliedAt, email_status: emailStatus });
}