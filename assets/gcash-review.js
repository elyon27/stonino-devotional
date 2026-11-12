'use strict';

const form = document.getElementById('reviewForm');
const token = document.getElementById('reviewToken');
const reference = document.getElementById('reviewReference');
const lookup = document.getElementById('lookupReview');
const approve = document.getElementById('approveReview');
const status = document.getElementById('reviewStatus');
const labels = { candle: 'Virtual candle', 'novena-candle': 'Novena candle', 'novena-flowers': 'Novena bouquet' };
let review;

async function request(method, body) {
  const response = await fetch('/.netlify/functions/offering-payment?review=1', {
    method, headers: { Authorization: 'Bearer ' + token.value, 'Content-Type': 'application/json' },
    body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(12000)
  });
  const result = await response.json();
  if (response.status === 401) throw new Error('The review token was rejected.');
  if (response.status === 404) throw new Error('No offering request has been submitted for that reference.');
  if (!response.ok) throw new Error(result.error || 'Review is temporarily unavailable.');
  return result;
}

async function run(task) {
  lookup.disabled = approve.disabled = true;
  token.readOnly = reference.readOnly = true;
  try { await task(); }
  catch (error) { status.textContent = error.message; }
  finally {
    lookup.disabled = approve.disabled = false;
    token.readOnly = reference.readOnly = false;
  }
}

form.onsubmit = event => {
  event.preventDefault();
  void run(async () => {
    approve.hidden = true;
    review = null;
    const value = reference.value.trim().toUpperCase();
    const result = await request('POST', { reference: value });
    review = { reference: value, expectedId: result.id };
    const kind = labels[result.kind];
    const amount = '₱' + (result.amountCentavos / 100).toFixed(2);
    status.textContent = kind + ' · ' + amount + ' · ' + (result.status === 'paid' ? 'Already approved' :
      'Awaiting approval · Submitted ' + new Date(result.submittedAt).toLocaleString());
    approve.textContent = 'Approve verified ' + amount + ' payment';
    approve.hidden = result.status !== 'pending';
  });
};

approve.onclick = () => run(async () => {
  if (!review || reference.value.trim().toUpperCase() !== review.reference) return;
  await request('PUT', review);
  approve.hidden = true;
  status.textContent = 'Payment approved. The offering will appear when the visitor checks its status.';
});
form.addEventListener('input', () => { approve.hidden = true; review = null; });
