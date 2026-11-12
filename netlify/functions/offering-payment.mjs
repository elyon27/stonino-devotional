import { getStore } from '@netlify/blobs';

const amount = 100;
const expirySeconds = 1800;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const kinds = new Set(['candle', 'novena-candle', 'novena-flowers']);
const reply = (status, body) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' }
});

async function paymongo(path, key, attributes) {
  const response = await fetch('https://api.paymongo.com/v1/' + path, {
    method: attributes ? 'POST' : 'GET',
    headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'),
      'Content-Type': 'application/json' },
    body: attributes && JSON.stringify({ data: { attributes } }),
    signal: AbortSignal.timeout(7000)
  });
  if (!response.ok) throw new Error('PayMongo HTTP ' + response.status);
  return (await response.json()).data;
}

async function generateOrder(id, kind, secret, publicKey) {
  const intent = await paymongo('payment_intents', secret, {
    amount, currency: 'PHP', payment_method_allowed: ['qrph'],
    description: `Sto. Niño Devotional - ${kind} - ${id.slice(0, 8)}`
  });
  const method = await paymongo('payment_methods', publicKey, {
    type: 'qrph', expiry_seconds: expirySeconds
  });
  const expires = Date.now() + expirySeconds * 1000;
  const attached = await paymongo(`payment_intents/${encodeURIComponent(intent.id)}/attach`, publicKey,
    { payment_method: method.id, client_key: intent.attributes.client_key });
  const raw = attached.attributes.next_action?.code?.image_url;
  const qr = typeof raw === 'string' && !raw.startsWith('data:') ? 'data:image/png;base64,' + raw : raw;
  if (typeof qr !== 'string' || !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=\r\n]+$/.test(qr)) {
    throw new Error('Missing QR image');
  }
  return { intent: intent.id, kind, expires, qr };
}

async function confirmOrder(store, id, order, secret) {
  if (order.paidAt) return { status: 'paid', paidAt: order.paidAt };
  const data = await paymongo(`payment_intents/${encodeURIComponent(order.intent)}`, secret);
  const attrs = data.attributes;
  if (data.id !== order.intent || attrs.amount !== amount || attrs.currency !== 'PHP') {
    throw new Error('Payment details mismatch');
  }
  if (attrs.status === 'succeeded') {
    // The conditional write gives all retries the same confirmation time.
    const paid = { intent: order.intent, kind: order.kind, expires: order.expires,
      qr: null, paidAt: new Date().toISOString() };
    const result = await store.setJSON(id, paid, { onlyIfMatch: order.etag });
    const confirmed = result.modified ? paid : await store.get(id, { type: 'json' });
    if (!confirmed?.paidAt) throw new Error('Payment confirmation could not be stored');
    return { status: 'paid', paidAt: confirmed.paidAt };
  }
  const qrExpired = Date.now() >= order.expires;
  const ended = ['cancelled', 'canceled', 'expired'].includes(attrs.status) ||
    (qrExpired && attrs.status === 'awaiting_payment_method');
  return { status: ended ? 'expired' : 'pending', qrExpired };
}

export default async function handler(request) {
  if (!['GET', 'POST'].includes(request.method)) return reply(405, {});
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  const kind = url.searchParams.get('kind');
  if (!uuid.test(id ?? '') || !kinds.has(kind)) return reply(400, {});
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, {});
  const secret = process.env.PAYMONGO_SECRET_KEY ?? '';
  const publicKey = process.env.PAYMONGO_PUBLIC_KEY ?? '';
  const mode = /^sk_(test|live)_/.exec(secret)?.[1];
  if (!mode || !publicKey.startsWith(`pk_${mode}_`)) {
    return reply(503, { error: 'QR checkout is unavailable.' });
  }

  try {
    const store = getStore({ name: 'offering-orders-' + mode, consistency: 'strong' });
    if (request.method === 'GET') {
      const entry = await store.getWithMetadata(id, { type: 'json' });
      if (entry?.data?.kind !== kind) return reply(404, {});
      return reply(200, await confirmOrder(store, id, { ...entry.data, etag: entry.etag }, secret));
    }
    let order = await store.get(id, { type: 'json' });
    if (!order) {
      const candidate = await generateOrder(id, kind, secret, publicKey);
      // A QR is disclosed only after the matching order has been durably stored.
      const write = await store.setJSON(id, candidate, { onlyIfNew: true });
      order = write.modified ? candidate : await store.get(id, { type: 'json' });
    }
    if (order?.kind !== kind) return reply(409, {});
    return reply(200, { qr: order.qr, expires: order.expires, test: mode === 'test' });
  } catch (error) {
    console.error('Offering checkout:', error.message);
    return reply(502, { error: 'Payment service is temporarily unavailable.' });
  }
}
