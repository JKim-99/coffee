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
  const token = (request.headers.get('cookie') || '').split(';').map((part) => part.trim())
    .find((part) => part.startsWith('compose_session='))?.slice('compose_session='.length);
  if (!token || !env.DB) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const sessionHash = base64Url(new Uint8Array(digest));
  return env.DB.prepare(
    'SELECT id FROM users WHERE session_token_hash = ? AND session_expires_at > ? AND deleted_at IS NULL'
  ).bind(sessionHash, new Date().toISOString()).first();
}

export async function onRequestGet({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: '선호 메뉴를 사용하려면 로그인해 주세요.' }, 401);

  const { results } = await env.DB.prepare(
    'SELECT menu_id, created_at FROM favorite_menus WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(user.id).all();
  return json({ favorites: results });
}

export async function onRequestPost({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: '선호 메뉴를 등록하려면 로그인해 주세요.' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: '올바른 요청이 아닙니다.' }, 400); }
  const menuId = typeof body.menuId === 'string' ? body.menuId.trim() : '';
  if (!menuId || menuId.length > 40) return json({ error: '메뉴 정보가 올바르지 않습니다.' }, 400);

  await env.DB.prepare('INSERT OR IGNORE INTO favorite_menus (user_id, menu_id) VALUES (?, ?)')
    .bind(user.id, menuId).run();
  return json({ success: true, menuId, isFavorite: true }, 201);
}

export async function onRequestDelete({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return json({ error: '선호 메뉴를 변경하려면 로그인해 주세요.' }, 401);

  const menuId = new URL(request.url).searchParams.get('menuId');
  if (!menuId || menuId.length > 40) return json({ error: '메뉴 정보가 올바르지 않습니다.' }, 400);
  await env.DB.prepare('DELETE FROM favorite_menus WHERE user_id = ? AND menu_id = ?').bind(user.id, menuId).run();
  return json({ success: true, menuId, isFavorite: false });
}