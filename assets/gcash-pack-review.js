'use strict';

const form = document.getElementById('reviewForm');
const token = document.getElementById('reviewToken');
const reference = document.getElementById('reviewReference');
const approval = document.getElementById('reviewApproval');
const amount = document.getElementById('verifiedAmount');
const lookup = document.getElementById('lookupReview');
const approve = document.getElementById('approveReview');
const status = document.getElementById('reviewStatus');
let claim;

async function request(action, body) {
  const response = await fetch('/.netlify/functions/prayer-packs?action=' + action, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token.value.trim(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000)
  });
  const result = await response.json();
  if (response.status === 401) throw Error('The review token was rejected.');
  if (!response.ok) throw Error(result.error || 'Review is temporarily unavailable.');
  return result;
}

async function run(task) {
  lookup.disabled = approve.disabled = true;
  token.readOnly = reference.readOnly = amount.readOnly = true;
  try { await task(); }
  catch (error) { status.textContent = error.message; }
  finally {
    lookup.disabled = approve.disabled = false;
    token.readOnly = reference.readOnly = amount.readOnly = false;
  }
}

form.onsubmit = event => {
  event.preventDefault();
  void run(async () => {
    claim = null;
    approval.hidden = true;
    amount.value = '';
    const value = reference.value.trim();
    const result = await request('review', { reference: value });
    claim = { ...result, reference: value };
    const created = new Date(result.createdAt).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    status.textContent = `${result.credits} credits · ₱${result.credits} · Order created ${created} Philippine time · ${result.status === 'paid' ? 'Already approved' : 'Awaiting verification'}`;
    approval.hidden = result.status === 'paid';
  });
};

approve.onclick = () => void run(async () => {
  if (!claim || claim.reference !== reference.value.trim() || amount.valueAsNumber !== claim.credits) {
    throw Error('Enter the exact pack amount shown in your GCash transaction.');
  }
  await request('approve', { reference: claim.reference, orderId: claim.orderId, verifiedCentavos: claim.credits * 100 });
  approval.hidden = true;
  status.textContent = 'Payment approved. The credits are now available to the purchaser.';
});

for (const field of [token, reference]) field.addEventListener('input', () => {
  approval.hidden = true;
  claim = null;
});
