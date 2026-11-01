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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      try {
        const result = await env.DB.prepare(
          'SELECT (SELECT COUNT(*) FROM inquiries) AS inquiries, (SELECT COUNT(*) FROM users) AS users'
        ).first();
        return json({ status: 'ok', database: 'connected', ...result });
      } catch (error) {
        return json({ status: 'error', database: 'unavailable' }, 503);
      }
    }

    return json({ error: 'Not found' }, 404);
  }
};