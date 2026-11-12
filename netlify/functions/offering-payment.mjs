import { createHash, timingSafeEqual } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const referencePattern = /^[A-Z0-9-]{8,40}$/;
const kinds = new Set(['candle', 'novena-candle', 'novena-flowers']);
const digest = value => createHash('sha256').update(value).digest();
const reply = (status, body) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store' }
});

export default async function handler(request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, {});
  const token = process.env.GCASH_REVIEW_TOKEN ?? '';
  if (token.length < 32) return reply(503, { error: 'GCash checkout is unavailable.' });
  const url = new URL(request.url);
  if (request.method === 'GET' && url.searchParams.has('ready')) return reply(200, { ready: true });
  if (!['POST', 'PUT'].includes(request.method)) return reply(405, {});
  const admin = url.searchParams.has('review');
  if (admin && !timingSafeEqual(digest('Bearer ' + token), digest(request.headers.get('authorization') ?? ''))) {
    return reply(401, {});
  }
  if (!admin && request.method === 'PUT') return reply(405, {});
  const input = await request.json().catch(() => ({}));
  const ref = typeof input?.reference === 'string' ? input.reference.trim().toUpperCase() : '';
  const id = input?.id;
  const kind = input?.kind;
  if (!referencePattern.test(ref) || (!admin && (!uuid.test(id ?? '') || !kinds.has(kind)))) {
    return reply(400, { error: 'Enter a valid GCash transaction reference.' });
  }

  try {
    const store = getStore({ name: 'gcash-offering-reviews', consistency: 'strong' });
    const key = digest(ref).toString('hex');
    if (!admin && input.action !== 'status') {
      const claim = { id, kind, submittedAt: new Date().toISOString() };
      const result = await store.setJSON(key, claim, { onlyIfNew: true });
      if (!result.modified) {
        const existing = await store.get(key, { type: 'json' });
        if (existing?.id !== id || existing.kind !== kind) {
          return reply(409, { error: 'This reference has already been submitted.' });
        }
      }
      return reply(200, { status: 'pending' });
    }
    const entry = await store.getWithMetadata(key, { type: 'json' });
    const order = entry?.data;
    if (!order || (!admin && (order.id !== id || order.kind !== kind))) return reply(404, {});
    if (request.method === 'PUT' && !order.paidAt) {
      if (input?.expectedId !== order.id) return reply(409, { error: 'Look up the reference before approving.' });
      const paidAt = new Date().toISOString();
      const saved = await store.setJSON(key, { ...order, paidAt }, { onlyIfMatch: entry.etag });
      if (!saved.modified) return reply(409, { error: 'The request changed. Look it up again.' });
      return reply(200, { status: 'paid', paidAt });
    }
    const status = order.paidAt ? { status: 'paid', paidAt: order.paidAt } : { status: 'pending' };
    return reply(200, admin ? { ...status, id: order.id, kind: order.kind, submittedAt: order.submittedAt } : status);
  } catch (error) {
    console.error('GCash offering storage:', error.name);
    return reply(502, { error: 'Checkout is temporarily unavailable. Keep your GCash reference and try again.' });
  }
}
