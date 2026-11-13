// Keep live app, account and payment requests on the network.
const home = new URL('./', self.registration.scope).href;

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate' || event.request.url !== home) return;

  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sto. Niño Devotional</title><h1>Sto. Niño Devotional</h1><p>Reconnect to the internet, then <a href="./">reopen the sanctuary</a>.</p></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )));
});
