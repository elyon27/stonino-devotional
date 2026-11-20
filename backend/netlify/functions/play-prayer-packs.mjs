import { createHash, createHmac, sign } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const products = new Map([50, 150, 250, 500].map(credits => [`prayer_pack_${credits}`, credits]));
const packageName = 'net.crownmind.stoninodevotional.direct';
const tokenUrl = 'https://oauth2.googleapis.com/token';
const reply = (status, body) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function publisherToken(email, key) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = encode({
    iss: email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: tokenUrl, iat: now, exp: now + 300
  });
  const input = encode({ alg: 'RS256', typ: 'JWT' }) + '.' + claims;
  const assertion = input + '.' + sign('RSA-SHA256', Buffer.from(input), key).toString('base64url');
  const response = await fetch(tokenUrl, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error('Google authorization failed');
  const { access_token: accessToken } = await response.json();
  if (!accessToken) throw new Error('Google authorization response invalid');
  return accessToken;
}

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, {});
  const auth = request.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return reply(401, {});
  const {
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PLAY_BILLING_CLIENT_EMAIL,
    PLAY_BILLING_PRIVATE_KEY, PLAY_BILLING_ACCOUNT_SECRET
  } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PLAY_BILLING_CLIENT_EMAIL ||
      !PLAY_BILLING_PRIVATE_KEY || !(PLAY_BILLING_ACCOUNT_SECRET?.length >= 32)) {
    return reply(503, { error: 'Google Play checkout is unavailable.' });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
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

    const accessToken = await publisherToken(PLAY_BILLING_CLIENT_EMAIL, PLAY_BILLING_PRIVATE_KEY.replace(/\\n/g, '\n'));
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${encodeURIComponent(token)}`;
    const getPurchase = async () => {
      const response = await fetch(url, {
        headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(10000)
      });
      if ([400, 404, 410].includes(response.status)) return null;
      if (!response.ok) throw new Error('Google purchase lookup failed');
      return response.json();
    };
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
    const { data: credited, error: grantError } = await admin.rpc('stonino_credit_play_prayer_pack', {
      owner_id: user.id, purchase_id: purchaseId, pack_credits: products.get(productId),
      already_consumed: purchase.consumptionState === 1
    });
    if (grantError) throw grantError;
    if (!credited) return reply(409, { error: 'Purchase is unavailable for this account.' });
    if (purchase.consumptionState === 0) {
      const consumed = await fetch(url + ':consume', {
        method: 'POST', headers: { Authorization: 'Bearer ' + accessToken }, signal: AbortSignal.timeout(10000)
      });
      if (!consumed.ok && (await getPurchase())?.consumptionState !== 1) {
        throw new Error('Google purchase consumption failed');
      }
    }
    return reply(200, { status: 'paid' });
  } catch {
    return reply(503, { error: 'Could not finish this purchase. Please try again.' });
  }
}
