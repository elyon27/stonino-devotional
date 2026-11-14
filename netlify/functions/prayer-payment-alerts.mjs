import { createClient } from '@supabase/supabase-js';
import { sendPaymentAlert } from '../lib/prayer-payment-email.mjs';

export const config = { schedule: '*/15 * * * *' };

export default async function () {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, PRAYER_PACK_EMAIL_FROM } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY || !PRAYER_PACK_EMAIL_FROM) {
    return new Response(null, { status: 204 });
  }
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data, error } = await admin.from('stonino_prayer_pack_orders')
    .select('id,credits,notification_sent_at').not('payment_reference', 'is', null)
    .is('notification_sent_at', null).order('submitted_at').limit(10);
  if (error) return new Response(null, { status: 502 });
  const results = await Promise.allSettled(data.map(order => sendPaymentAlert(admin, order)));
  return new Response(null, { status: results.some(result => result.status === 'rejected') ? 502 : 204 });
}
