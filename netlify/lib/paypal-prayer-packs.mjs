// Keep the price list server-side. Values are exact USD decimal strings.
const prices = new Map([[50, '1.00'], [150, '3.00'], [250, '5.00'], [500, '10.00']]);
const paypalId = /^[A-Z0-9]{1,36}$/;

export function paypalCheckout(site) {
  const { PAYPAL_CLIENT_ID: clientId, PAYPAL_CLIENT_SECRET: secret, PAYPAL_MODE: mode } = process.env;
  if (!site || !clientId || !secret || !['sandbox', 'live'].includes(mode)) return null;
  if (mode === 'sandbox' && process.env.CONTEXT === 'production') return null;

  const sandbox = mode === 'sandbox';
  const api = sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
  const prefix = 'paypal-' + mode + ':';
  let token;
  async function request(path, options) {
    const response = await fetch(api + path, {
      ...options, redirect: 'error', signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error('PayPal request failed');
    return response.json();
  }

  async function orderRequest(path, options = {}) {
    if (!token) {
      const result = await request('/v1/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });
      token = result.access_token;
    }
    return request('/v2/checkout/orders' + path, {
      ...options,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...options.headers }
    });
  }

  return {
    price: credits => prices.get(credits),
    owns: providerId => providerId?.startsWith(prefix),
    async create(order) {
      const back = new URL(site);
      back.searchParams.set('prayerPackOrder', order.id);
      back.hash = 'prayerPacks';
      const cancel = new URL(back);
      cancel.searchParams.set('prayerPackCancelled', '1');
      const result = await orderRequest('', {
        method: 'POST',
        headers: { 'PayPal-Request-Id': order.id },
        body: JSON.stringify({
          intent: 'CAPTURE',
          payment_source: { paypal: { experience_context: {
            return_url: back.href, cancel_url: cancel.href,
            shipping_preference: 'NO_SHIPPING', user_action: 'PAY_NOW'
          } } },
          purchase_units: [{
            custom_id: order.id,
            description: order.credits + ' Sto. Niño Devotional Prayer Pack credits',
            amount: { currency_code: 'USD', value: prices.get(order.credits) }
          }]
        })
      });
      const href = result.links?.find(link => ['payer-action', 'approve'].includes(link.rel))?.href;
      const url = new URL(href);
      const hosts = sandbox ? ['www.sandbox.paypal.com'] : ['www.paypal.com'];
      if (!paypalId.test(result.id ?? '') || url.protocol !== 'https:' || url.port ||
          url.username || url.password || !hosts.includes(url.hostname)) {
        throw new Error('Invalid PayPal checkout');
      }
      return { providerId: prefix + result.id, checkoutUrl: url.href };
    },
    async status(order) {
      const id = order.provider_id.slice(prefix.length);
      const value = prices.get(order.credits);
      if (!paypalId.test(id) || !value) throw new Error('Invalid saved PayPal order');
      const path = '/' + id;
      const details = await orderRequest(path);
      const units = details.purchase_units;
      if (details.id !== id || details.intent !== 'CAPTURE' || units?.length !== 1 ||
          units[0].custom_id !== order.id || units[0].amount?.currency_code !== 'USD' ||
          units[0].amount.value !== value) throw new Error('PayPal order mismatch');

      if (details.status === 'VOIDED') return 'expired';
      if (['CREATED', 'SAVED', 'PAYER_ACTION_REQUIRED'].includes(details.status)) return 'unapproved';
      let payment = details;
      if (details.status === 'APPROVED') {
        payment = await orderRequest(path + '/capture', {
          method: 'POST',
          headers: { 'PayPal-Request-Id': 'capture-' + order.id },
          body: '{}'
        });
      }
      if (payment.id !== id) throw new Error('PayPal capture order mismatch');
      const captures = payment.purchase_units?.[0]?.payments?.captures;
      if (captures?.length !== 1) return 'pending';
      const [capture] = captures;
      if (capture.status === 'DECLINED' || capture.status === 'FAILED') return 'expired';
      if (capture.status !== 'COMPLETED') return 'pending';
      if (capture.amount?.currency_code !== 'USD' || capture.amount.value !== value ||
          capture.final_capture !== true) throw new Error('PayPal capture amount mismatch');
      return 'paid';
    }
  };
}
