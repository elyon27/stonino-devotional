import { sendPaymentAlert } from '../lib/prayer-payment-email.mjs';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual, createHash } from 'node:crypto';

const directPrefix = 'gcash-express:';
const referencePattern = /^[A-Z0-9-]{8,40}$/;
const packs = new Set([20, 50, 100, 200]);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (status, data) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const hash = value => createHash('sha256').update(value).digest();

function httpsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export default async function handler(request) {
  const api = httpsUrl(process.env.PRAYER_PACK_MERCHANT_URL);
  const site = httpsUrl(process.env.PRAYER_PACK_SITE_URL);
  const checkoutOrigin = httpsUrl(process.env.PRAYER_PACK_CHECKOUT_ORIGIN);
  const merchantKey = process.env.PRAYER_PACK_MERCHANT_KEY;
  const notificationKey = process.env.PRAYER_PACK_NOTIFICATION_KEY;
  const project = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const merchantConfigured = Boolean(api && site && checkoutOrigin && merchantKey && notificationKey?.length >= 32);
  const reviewToken = process.env.GCASH_REVIEW_TOKEN ?? '';
  const useDirect = process.env.PRAYER_PACK_PAYMENT_MODE !== 'merchant';
  const configured = Boolean(project && serviceKey && (useDirect || merchantConfigured));
  const action = new URL(request.url).searchParams.get('action');
  if (request.method === 'GET' && action === 'ready') return reply(200, { available: configured });
  if (request.method !== 'POST') return reply(405, {});
  const review = action === 'review' || action === 'approve';
  const dashboard = ['admin-session', 'admin-list', 'admin-confirm', 'admin-members', 'admin-awaiting'].includes(action);
  if (!project || !serviceKey || (!configured && !dashboard && !review && action !== 'notify' && action !== 'status')) {
    return reply(503, { error: 'Could not start checkout. Please try again.' });
  }

  const admin = createClient(project, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = request.headers.get('authorization') ?? '';
  const merchant = async (path, body) => {
    const url = new URL(path, api.href.replace(/\/?$/, '/'));
    const response = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + merchantKey, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      redirect: 'error',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error('Merchant request failed');
    return response.json();
  };
  try {
    let userId;
    if (review) {
      if (reviewToken.length < 32 || !timingSafeEqual(hash(authorization), hash('Bearer ' + reviewToken))) return reply(401, {});
    } else if (action === 'notify') {
      if (!merchantConfigured || !timingSafeEqual(hash(authorization), hash('Bearer ' + notificationKey))) return reply(401, {});
    } else {
      if (request.headers.get('sec-fetch-site') === 'cross-site') return reply(403, {});
      if (!authorization.startsWith('Bearer ')) return reply(401, { error: 'Please sign in again.' });
      const { data, error } = await admin.auth.getUser(authorization.slice(7));
      if (error || !data.user || data.user.is_anonymous) return reply(401, { error: 'Please sign in again.' });
      userId = data.user.id;
      if (dashboard && (!data.user.email_confirmed_at || data.user.email?.toLowerCase() !== 'leuneib01@gmail.com')) {
        return reply(403, { error: 'Payment review requires the verified admin account.' });
      }
    }
    const body = await request.json().catch(() => null);
    const reference = typeof body?.reference === 'string' ? body.reference.trim().toUpperCase() : '';
    const directId = directPrefix + hash(reference).toString('hex');
    const orders = admin.from('stonino_prayer_pack_orders');
    if (action === 'admin-session') return reply(200, { admin: true });
    if (action === 'admin-awaiting') {
      const { data, error } = await orders.select('id').not('payment_reference', 'is', null)
        .not('user_id', 'is', null).is('paid_at', null).limit(1);
      if (error) throw error;
      return reply(200, { awaiting: data.length > 0 });
    }
    if (action === 'admin-members') {
      const offset = body?.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 2147483647) {
        return reply(400, { error: 'Invalid page.' });
      }
      const { data, error } = await admin.rpc('stonino_admin_members', { page_offset: offset });
      if (error) throw error;
      return reply(200, { members: data.slice(0, 50), more: data.length > 50 });
    }
    if (action === 'admin-list') {
      const offset = body?.offset ?? 0;
      if (!Number.isSafeInteger(offset) || offset < 0) return reply(400, { error: 'Invalid page.' });
      const { data, error } = await admin.rpc('stonino_admin_pending_payments', { page_offset: offset });
      if (error) throw error;
      return reply(200, { payments: data.slice(0, 50), more: data.length > 50 });
    }
    if (action === 'admin-confirm') {
      if (typeof body?.orderId !== 'string' || !uuid.test(body.orderId)) return reply(400, { error: 'Invalid order.' });
      const { data: claim, error } = await orders.select('id,user_id,provider_id,credits,payment_reference')
        .eq('id', body.orderId).maybeSingle();
      if (error) throw error;
      if (!claim?.user_id || !claim.payment_reference || !claim.provider_id?.startsWith(directPrefix)) {
        return reply(404, { error: 'Payment claim unavailable.' });
      }
      if (body.verifiedCentavos !== claim.credits * 100) return reply(409, { error: 'Verify the exact amount received.' });
      const settled = await admin.rpc('stonino_settle_prayer_pack', {
        order_id: claim.id, verified_provider_id: claim.provider_id, paid_centavos: body.verifiedCentavos
      });
      if (settled.error) throw settled.error;
      return reply(200, { status: 'paid' });
    }
    if (review) {
      if (!referencePattern.test(reference)) return reply(400, { error: 'Enter a valid GCash reference.' });
      const { data: claim, error: lookupError } = await orders.select('*').eq('provider_id', directId).maybeSingle();
      if (lookupError) throw lookupError;
      if (!claim?.user_id) return reply(404, { error: 'No active Prayer Pack claim uses this reference.' });
      if (action === 'approve') {
        if (body.orderId !== claim.id || body.verifiedCentavos !== claim.credits * 100) {
          return reply(409, { error: 'Verify the exact amount received before approving.' });
        }
        const { error } = await admin.rpc('stonino_settle_prayer_pack', {
          order_id: claim.id, verified_provider_id: directId, paid_centavos: body.verifiedCentavos
        });
        if (error) throw error;
        return reply(200, { status: 'paid' });
      }
      return reply(200, {
        orderId: claim.id, credits: claim.credits, createdAt: claim.created_at,
        status: claim.paid_at ? 'paid' : 'pending'
      });
    }
    if (typeof body?.orderId !== 'string' || !uuid.test(body.orderId)) return reply(400, { error: 'Invalid order.' });
    let { data: order, error } = await orders.select('*').eq('id', body.orderId).maybeSingle();
    if (error) throw error;
    if (userId && order && order.user_id !== userId) return reply(404, { error: 'Order unavailable.' });

    if (action === 'claim') {
      if (!order || order.checkout_url || !referencePattern.test(reference)) {
        return reply(400, { error: 'Choose a pack and enter a valid GCash transaction reference.' });
      }
      if (order.provider_id === directId) return reply(200, { status: order.paid_at ? 'paid' : 'review' });
      if (order.provider_id || order.paid_at) return reply(409, { error: 'A payment reference is already attached to this order.' });
      const saved = await orders.update({
        provider_id: directId, payment_reference: reference, submitted_at: new Date().toISOString()
      }).eq('id', order.id)
        .eq('user_id', userId).is('provider_id', null).select('provider_id').maybeSingle();
      if (saved.error?.code === '23505') return reply(409, { error: 'This GCash reference has already been submitted.' });
      if (saved.error) throw saved.error;
      if (!saved.data) return reply(409, { error: 'This order changed. Check its payment status.' });
      await sendPaymentAlert(admin, order).catch(() => console.error('Prayer Pack payment alert will be retried.'));
      return reply(200, { status: 'review' });
    }

    if (action === 'checkout') {
      if (!packs.has(body.credits) || (order && order.credits !== body.credits)) return reply(400, { error: 'Invalid Prayer Pack.' });
      if (order?.paid_at) return reply(200, { status: 'paid' });
      if (!order) {
        const created = await orders.upsert({
          id: body.orderId, user_id: userId, credits: body.credits
        }, { onConflict: 'id', ignoreDuplicates: true }).select().maybeSingle();
        if (created.error) throw created.error;
        if (!created.data) return reply(409, { error: 'Checkout is being prepared. Please retry.' });
        order = created.data;
      }
      if (order.provider_id?.startsWith(directPrefix)) return reply(200, { status: 'review' });
      if (useDirect && !order.provider_id) {
        return reply(200, { paymentMethod: 'gcash-qr', credits: order.credits, createdAt: order.created_at });
      }
      if (!merchantConfigured) return reply(503, { error: 'Merchant checkout is currently unavailable.' });
      const back = new URL(site);
      back.searchParams.set('prayerPackOrder', order.id);
      back.hash = 'prayerPacks';
      const session = await merchant('checkouts', {
        orderId: order.id, amountCentavos: order.credits * 100, currency: 'PHP', paymentMethod: 'qrph', returnUrl: back.href
      });
      const checkout = httpsUrl(session.checkoutUrl);
      const qr = session.qrPngBase64;
      if (typeof session.id !== 'string' || !session.id || checkout?.origin !== checkoutOrigin.origin ||
          typeof qr !== 'string' || qr.length > 350000 || !/^iVBORw0KGgo[A-Za-z0-9+/]+={0,2}$/.test(qr) ||
          !Number.isFinite(Date.parse(session.expiresAt)) || order.provider_id && order.provider_id !== session.id) {
        throw new Error('Invalid merchant QR checkout');
      }
      const checkoutResult = Date.parse(session.expiresAt) <= Date.now() ? { status: 'expired' } : {
        qrPngBase64: qr, expiresAt: session.expiresAt, checkoutUrl: checkout.href, credits: order.credits
      };
      if (order.provider_id) return reply(200, checkoutResult);
      const saved = await orders.update({ provider_id: session.id, checkout_url: checkout.href })
        .eq('id', order.id).is('provider_id', null).select('provider_id,checkout_url').maybeSingle();
      if (saved.error) throw saved.error;
      if (!saved.data) {
        const existing = await orders.select('provider_id,checkout_url').eq('id', order.id).single();
        if (existing.error || existing.data.provider_id !== session.id) throw new Error('Merchant checkout mismatch');
        return reply(200, checkoutResult);
      }
      return reply(200, checkoutResult);
    }

    if (action !== 'status' && action !== 'notify') return reply(404, {});
    if (!order) return reply(404, { error: 'Order unavailable.' });
    if (order.paid_at) return reply(200, { status: 'paid' });
    if (!order.provider_id) return reply(action === 'notify' ? 409 : 200, { status: 'pending' });

    if (order.provider_id.startsWith(directPrefix)) return reply(200, { status: 'review' });
    if (!merchantConfigured) return reply(503, { error: 'Merchant checkout is currently unavailable.' });
    const payment = await merchant('checkouts/' + encodeURIComponent(order.provider_id));
    if (payment.status === 'expired' || payment.status === 'cancelled') return reply(200, { status: 'expired' });
    if (payment.status !== 'paid') return reply(200, { status: 'pending' });
    if (payment.id !== order.provider_id || payment.orderId !== order.id ||
        payment.currency !== 'PHP' || payment.amountCentavos !== order.credits * 100) {
      throw new Error('Merchant payment mismatch');
    }
    const settled = await admin.rpc('stonino_settle_prayer_pack', {
      order_id: order.id, verified_provider_id: payment.id, paid_centavos: payment.amountCentavos
    });
    if (settled.error) throw settled.error;
    return reply(200, { status: 'paid' });
  } catch (error) {
    console.error('Prayer Pack checkout:', error.code ?? error.name);
    return reply(502, { error: 'Could not check your Prayer Pack. Please try again.' });
  }
}
