export async function sendPaymentAlert(admin, order) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.PRAYER_PACK_EMAIL_FROM;
  if (!key || !from || order.notification_sent_at) return;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'prayer-pack/' + order.id
    },
    body: JSON.stringify({
      from,
      to: ['leuneib01@gmail.com'],
      subject: 'Sto. Niño Prayer Pack payment awaiting verification',
      text: `A buyer submitted a GCash payment reference for a ₱${order.credits} Prayer Pack. Sign in to Sto. Niño Devotional and open Payment Review to verify it against your GCash transaction history.`
    }),
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) throw Error('Payment alert provider rejected the request.');
  const { error } = await admin.from('stonino_prayer_pack_orders')
    .update({ notification_sent_at: new Date().toISOString() }).eq('id', order.id);
  if (error) throw error;
}
