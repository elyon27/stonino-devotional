const reply = (status, body) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' }
});

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, {});
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reply(401, {});

  const origin = process.env.PLAY_BILLING_VERIFIER_URL?.replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9-]+\.run\.app$/.test(origin ?? '')) {
    return reply(503, { error: 'Google Play checkout is unavailable.' });
  }
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 16 * 1024) return reply(413, {});
    const result = await fetch(origin + '/play-prayer-packs', {
      method: 'POST',
      headers: { authorization, 'Content-Type': 'application/json' },
      body,
      redirect: 'error',
      signal: AbortSignal.timeout(25000)
    });
    return reply(result.status, await result.json());
  } catch {
    return reply(503, { error: 'Could not finish this purchase. Please try again.' });
  }
}
