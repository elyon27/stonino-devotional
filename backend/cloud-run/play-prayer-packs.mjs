import { createHash, createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const products = new Map([50, 150, 250, 500].map(credits => [`prayer_pack_${credits}`, credits]));
const packageName = 'net.crownmind.stoninodevotional.direct';
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function publisherToken(email) {
  const metadata = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(5000)
  });
  if (!metadata.ok) throw Object.assign(new Error('Cloud Run identity unavailable'), { upstreamStatus: metadata.status });
  const { access_token: runtimeToken } = await metadata.json();
  if (!runtimeToken) throw new Error('Cloud Run identity response invalid');

  const response = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(email)}:generateAccessToken`,
    {
      method: 'POST', signal: AbortSignal.timeout(5000),
      headers: { Authorization: 'Bearer ' + runtimeToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/androidpublisher'] })
    }
  );
  if (!response.ok) throw Object.assign(new Error('Google Play authorization failed'), { upstreamStatus: response.status });
  const { accessToken } = await response.json();
  if (!accessToken) throw new Error('Google Play authorization response invalid');
  return accessToken;
}

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, {});
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return reply(401, {});
  const {
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLAY_BILLING_CLIENT_EMAIL,
    PLAY_BILLING_ACCOUNT_SECRET
  } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PLAY_BILLING_CLIENT_EMAIL ||
      !(PLAY_BILLING_ACCOUNT_SECRET?.length >= 32)) {
    return reply(503, { error: 'Google Play checkout is unavailable.' });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let stage = 'supabase_auth';
  try {
    const { data, error } = await admin.auth.getUser(auth.slice(7));
    const user = data?.user;
    if (error || !user || user.is_anonymous) return reply(401, {});
    const accountId = createHmac('sha256', PLAY_BILLING_ACCOUNT_SECRET).update(user.id).digest('hex');
    const body = await request.json().catch(() => null);
    if (body?.action === 'prepare') return reply(200, { accountId });
    const productId = body?.productId;
    const token = body?.purchaseToken;
    if (body?.action !== 'complete' || !products.has(productId) ||
        typeof token !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(token)) {
      return reply(400, { error: 'Invalid Prayer Pack purchase.' });
    }

    stage = 'google_authorization';
    const accessToken = await publisherToken(PLAY_BILLING_CLIENT_EMAIL);
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${encodeURIComponent(token)}`;
    const getPurchase = async () => {
      const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(10000)
      });
      if ([400, 404, 410].includes(response.status)) return null;
      if (!response.ok) throw Object.assign(new Error('Google purchase lookup failed'), { upstreamStatus: response.status });
      return response.json();
    };
    stage = 'google_purchase_lookup';
    const purchase = await getPurchase();
    if (!purchase || purchase.obfuscatedExternalAccountId !== accountId ||
        (purchase.productId && purchase.productId !== productId) || (purchase.quantity ?? 1) !== 1) {
      return reply(409, { error: 'Purchase does not match this account or Prayer Pack.' });
    }
    if (purchase.purchaseState === 2) return reply(202, { status: 'pending' });
    if (purchase.purchaseState !== 0 || ![0, 1].includes(purchase.consumptionState)) {
      return reply(409, { error: 'Purchase has not completed.' });
    }
    const purchaseId = 'google-play:' + createHash('sha256').update(token).digest('hex');
    stage = 'supabase_credit_grant';
    const { data: credited, error: grantError } = await admin.rpc('stonino_credit_play_prayer_pack', {
      owner_id: user.id, purchase_id: purchaseId, pack_credits: products.get(productId),
      already_consumed: purchase.consumptionState === 1
    });
    if (grantError) throw grantError;
    if (!credited) return reply(409, { error: 'Purchase is unavailable for this account.' });
    if (purchase.consumptionState === 0) {
      stage = 'google_purchase_consume';
      const consumed = await fetch(url + ':consume', {
        method: 'POST', headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(10000)
      });
      if (!consumed.ok && (await getPurchase())?.consumptionState !== 1) {
        throw Object.assign(new Error('Google purchase consumption failed'), { upstreamStatus: consumed.status });
      }
    }
    return reply(200, { status: 'paid' });
  } catch (error) {
    const code = typeof error?.code === 'string' &&
      /^(?:[0-9A-Z]{5}|PGRST[0-9]{3})$/.test(error.code)
      ? error.code
      : undefined;
    const upstreamStatus = Number.isInteger(error?.upstreamStatus)
      ? error.upstreamStatus
      : undefined;
    console.error(JSON.stringify({
      severity: 'ERROR',
      message: 'Prayer Pack verification failed',
      stage,
      code,
      upstreamStatus
    }));
    return reply(503, { error: 'Could not finish this purchase. Please try again.' });
  }
}
