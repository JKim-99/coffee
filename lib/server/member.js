export async function currentMember(request, env) {
  const token = (request.headers.get('cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('compose_session='))?.slice('compose_session='.length);
  if (!token || !env.DB) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return env.DB.prepare(
    'SELECT id, nickname, email FROM users WHERE session_token_hash = ? AND session_expires_at > ? AND deleted_at IS NULL'
  ).bind(hash, new Date().toISOString()).first();
}
