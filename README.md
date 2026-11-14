# Sto. Niño Devotional App — Cebu Heritage Chapel (Phase I draft)

**Status:** Functional standalone static-web prototype; not yet deployed, connected to a production Supabase project, pastorally reviewed, or packaged as an Android AAB.

## Features
- Mobile responsive, Cebu heritage-inspired virtual chapel with *original symbolic illustration* of the Holy Child Jesus.
- Original nine-day Scripture-inspired novena with progression tracking (not the Basilica's official novena).
- Original personal, family, thanksgiving and departed-souls prayers.
- Symbolic candle offerings that diminish over 24 hours (one credit per candle).
- Private prayer intention journal with add/delete.
- Seven Bible-reference meditations (no unlicensed Bible text reproduced).
- English, Cebuano and Filipino **navigation**; English prayers and reflections in this draft.
- Adjustable text size and reduced-motion support.
- Supabase email/password accounts are required. Devotional data syncs privately and can be exported or deleted.
- Public `privacy.html` and `account-deletion.html`.

## Quick start
Open `index.html` in a browser. Devotional features require a Supabase account. For best behavior, serve it locally (`python3 -m http.server 8000`) or deploy the folder to Netlify.

## Deployment to GitHub and Netlify
1. Create a separate repository. Upload all contents, preserving directories.
2. In Netlify, import the repository. Build command: `npm install` (for the optional cloud deletion function); publish directory: `.`. Netlify reads `netlify.toml`.
3. The published URL serves `/privacy.html` and `/account-deletion.html` for Google Play app listing requirements. Replace placeholder privacy details if operation changes.
4. Do not claim this is an official Basilica or Archdiocese app.

## Prayer Packs

The root web app sells 20, 50, 100 or 200 credits at ₱1 per credit. Each candle or bouquet uses one credit, including novena offerings. The balance is shared across signed-in devices. Prayer, Scripture and novena readings remain free. Deleting offerings does not restore credits. Deleting the Sto. Niño profile also deletes its unused balance.

### Interim GCash Express Send checkout

Express Send is the default purchase mode. The app displays the selected pack price and its GCash QR. The buyer scans the code and submits the GCash reference, then can use **Refresh balance** to recheck the order.

1. Apply `prayer-packs.sql` once if the Prayer Pack schema is absent. Deploy the web app and functions together.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` in the Netlify Functions environment.
3. Each pack uses its matching GCash image from `assets/gcash-packs/`. Each QR carries its pack amount. Buyers should confirm the recipient and amount in GCash before sending.
4. From your own GCash transaction history, verify the incoming reference, amount and time. Open Payment Review on the deployed site and confirm the matching payment. Only approve a new transfer received after its order was created. Never approve from a screenshot alone.

### Payment Review and email alerts

Apply `prayer-pack-admin.sql` after the original Prayer Pack migration, then deploy the updated site and Netlify functions. Keep Supabase email confirmation enabled. Sign in using the Supabase account with verified email `leuneib01@gmail.com` to open Payment Review automatically. It shows the buyer email, reference submission time in Philippine time, amount and reference number. Verify each transfer in GCash before confirming. The date shown is the submission date.

For alerts to `leuneib01@gmail.com`, set `RESEND_API_KEY` and `PRAYER_PACK_EMAIL_FROM` in Netlify Functions. Use a Resend-verified sender address. A submitted reference triggers an alert, and a scheduled function retries pending alerts. The existing token review page remains available for older claims that stored only a reference digest. `GCASH_REVIEW_TOKEN` is needed only for that legacy page.

### GCash for Business QR checkout

Set `PRAYER_PACK_PAYMENT_MODE=merchant` when the verified merchant service is ready. Existing Express Send claims can still be reviewed with the review token.

### Setup

1. For an existing database, run `prayer-packs.sql` once in the same Supabase project as `stonino_profiles`. For a new database, run `supabase-schema.sql` first. Publish the root web app and its Netlify functions together. Older clients that submit offerings directly to the profiles table need the updated web app.
2. Configure the Netlify Functions variables `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PRAYER_PACK_SITE_URL` (the canonical web app URL), `PRAYER_PACK_CHECKOUT_ORIGIN` (the HTTPS checkout host), `PRAYER_PACK_MERCHANT_URL` (the private merchant adapter base URL), `PRAYER_PACK_MERCHANT_KEY` and `PRAYER_PACK_NOTIFICATION_KEY` (at least 32 characters). Keep the keys server-side.
3. Connect an approved GCash-compatible QR Ph merchant payment integration to the adapter contract below. Checkout stays unavailable until these settings are present. The former GCash Express Send reference review is separate from Prayer Packs.
4. Verify a sandbox payment, the credit balance on a second signed-in device, and one debit for each offering before enabling live payments. This ZIP is web source. The historical APKs bundled in the archive predate Prayer Packs.

### Merchant adapter contract

The adapter is the server-side connection to your actual merchant provider. Use that provider's verified payment API and signed callbacks. The repository contains the app-side checkout and verification flow. It requires a working adapter to accept live payments.

- `POST checkouts` receives `{ orderId, amountCentavos, currency, paymentMethod, returnUrl }`. Create or resume one merchant checkout per `orderId`. For `paymentMethod: "qrph"`, create a dynamic, amount-specific QR Ph checkout that GCash can scan. Return `{ id, checkoutUrl, qrPngBase64, expiresAt }` consistently for repeated requests. Send a plain base64 PNG with its quiet zone and an ISO 8601 expiration timestamp. Return the same checkout for the same order even when it expires. Treat merchant cancellation or expiry as final only after the provider confirms there was no successful payment. Keep the order ID linked to the provider session.
- `GET checkouts/{id}` returns `{ id, orderId, amountCentavos, currency, status }`. Mark a payment `paid` only after verifying successful settlement through the provider. Use `pending`, `expired` or `cancelled` for other outcomes. Amounts are integers in PHP centavos.
- Both requests authenticate with the merchant adapter bearer key. On a verified payment event, the adapter sends `POST /.netlify/functions/prayer-packs?action=notify` with `{ orderId }` and the notification bearer key. Retry non-success responses. The app queries the adapter independently and checks the order, provider ID, currency and amount before adding credits. Returning to the app also triggers that check. Repeated events for the same paid order grant credits once.

## Required Supabase setup
1. Reuse an existing Supabase project. Execute `supabase-schema.sql` in Supabase SQL Editor.
2. Configure URL and public **anon/publishable** key in `assets/config.js`. Never paste the service-role key here.
3. In Supabase Auth configure Email provider, email-confirmation templates, Site URL and redirect allowlist to your Netlify domain.
4. Add Netlify environment variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server-side checkout and payment confirmation. Keep the service-role secret out of GitHub and front-end code.
5. Make sure Supabase Auth email delivery and Netlify functions work before enabling public signups. A public CAPTCHA/rate-limit strategy and monitoring are recommended.
6. Test sign-up, sign-in, display name setup, syncing, sign-out, password-reset email and account deletion with test accounts before Google Play submission.

**Account storage:** Browser copies are scoped to the signed-in account. Cloud sync stores devotional collections as private JSON in a single row and updates the collection that changed. Profile deletion uses Supabase row-level security. Existing cloud data loads when the user signs in. Older browser-only data is left on the device without being attached to an account. Avoid shared devices for sensitive intentions. Public prayer sharing is intentionally excluded.

## Faithful presentation and permissions
All included prayers and reflections are newly written for this draft. A local parish or competent Catholic reviewer should review theology and translations before release. The chapel's image is an original **stylized** symbol rather than the historical Santo Niño image. If replacing it with official Basilica photography or copying the official novena, seek permission and use correct attribution. An online devotional act does not substitute for sacramental participation.

## Future Android packaging
This directory is the web source for a later Android WebView or Trusted Web Activity release; it is **not** a signed `.aab`. Android packaging requires a stable URL, app ID, keystore and proper Google Play testing/permissions.

## Phase I candle upgrade (v1.1)

- `assets/styles.css` now creates a high-detail ivory wax candle with layered wax drips, pooled wax at the base, a warm glowing flame, subtle flicker, and light bloom. No external images or services required.
- `assets/app.js` renders each candle with its own 24-hour timestamp, smoothly reducing the wax body **from the top downward** while leaving the pooled wax fixed at its base. Refreshing the page resumes melting at the correct age. Candles disappear after 24 hours.
- Supports up to 24 offered candles, including existing guest records. Accessibility: respects `prefers-reduced-motion` (still shows the correct candle height on page load).
- For deployment, replace the older `assets/app.js` and `assets/styles.css` (or upload the whole ZIP). Hard refresh your browser after redeploying.


### Version 1.2 — Realistic animated candle asset
- Replaced the gradient/CSS-rendered candle with `assets/ivory-candle-flicker.gif`, a high-detail six-frame candle with a continuously flickering flame.
- The candle is anchored at its base and scales down progressively throughout its existing 24-hour lifetime.
- On refresh, the display derives its melting progress from the original candle creation timestamp.
- The guest and cloud persistence logic remains unchanged.
- Motion reduction settings disable the long melt transition; the GIF flame may still animate depending on browser accessibility settings.


## v1.3 — timestamp-synchronized melting candle
- Candle creation time (`created_at`) determines **both** visible remaining wax and the exact 24-hour expiration.
- On each second, the displayed wax height and countdown are recalculated from the same timestamp, not an animation started when the page loaded.
- Reloading, switching tabs, or returning after hours of inactivity preserves the correct candle size and countdown.
- At 12 hours elapsed, 50% of the consumable wax has burned; the little remaining base puddle stays anchored in place.
- The original high-detail animated GIF still provides the flickering flame and textured wax.
- Candles expire automatically at 24 hours.


## v1.4 — Corrected true 24-hour candle synchronization

The earlier v1.3 version scaled the full GIF, making the flame shrink along with the candle and obscuring wax consumption. Version 1.4 separates the realistic wax texture (`assets/candle-wax.png`) from the continuous flame animation (`assets/candle-flame.gif`). JavaScript calculates remaining seconds using the saved `created_at` offering timestamp. It positions the flame at the top of the remaining wax and decreases only wax height from 172px to 18px over 24 hours; the wax base is fixed. Existing offerings retain their original timestamps and are not reset. Refreshing the page or returning to a tab recalculates immediately. The original complete GIF is retained as an archival asset, but is no longer used in the UI.

## Version 1.5: Light / Dark appearance

Use the **☾ Dark / ☀ Light** button in the header or **Settings & Privacy → Chapel appearance**. The selection is saved in browser localStorage and does not change existing prayer records, candle timing, or cloud configuration. The dark theme covers cards, forms, reading text, and the chapel background on desktop and mobile.


## v1.7 — Authentic historical Santo Niño photograph
The sanctuary image is now a photograph of the original venerated Sto. Niño de Cebu rather than AI art. The image is hotlinked to Wikimedia Commons and requires internet access. Attribution: Cofradiabsn, *Original Image of the Santo Niño de Cebu-1.jpg*, CC BY 4.0, https://commons.wikimedia.org/wiki/File:Original_Image_of_the_Santo_Ni%C3%B1o_de_Cebu-1.jpg . For full offline support, download that photo and place it in `assets/` and replace the image `src` with its local path, retaining attribution.


## v1.8 update
- Corrected the sanctuary arch decorative outline so the inner border follows the arch evenly.
- Refined the Santo Niño photo positioning inside the heritage arch.

## v1.9 arch-border correction
- Eliminated the diagonal seam on the upper-right outer chapel arch by replacing the ridge-style border with a continuous solid-gold border.
- Kept the existing curved shape, photo, inner outline, and other devotional features.


## v2.0 update — Scripture popup
- Click the Scripture reference in any of the nine novena days to open a modal showing the complete passage in the public-domain King James Version (KJV), with verse numbers.
- Full passages are loaded from the free `https://bible-api.com/` endpoint. The first reading of each passage needs internet access; successful readings are cached in local browser storage for offline reuse.
- Includes Close and Escape behavior, loading, retry, and mobile styles.
- The Bible version is identified in the popup; this does not claim the KJV is a Catholic-approved liturgical translation.


## v2.1 — Independent novena candle offerings
The Novena & Prayers page now has a separate offering form and a separate candle display. Novena candles use `stonino.v1.novenaCandles` local storage, and do not appear on the Light a Candle page. Both use the same realistic flame and 24-hour wall-clock melting logic. Novena candles identify the selected day at the time of offering.

**Existing Supabase deployment:** run the last `alter table` statement from `supabase-schema.sql` in the Supabase SQL editor before deploying, or account synchronization involving the new novena candle field may fail. Guest mode requires no database changes.


## v2.2: Novena candle section visibility
- Moved Offer a Novena Candle immediately after the main nine-day prayer panel, before Additional original prayers.
- Added a prominent top-of-page shortcut that scrolls to the dedicated offering section.
- Preserves separately saved novena candles and the existing 24-hour lifetime.

## v2.3 — Novena layout cleanup
Removed the redundant top-of-page novena candle shortcut strip. The dedicated novena candle offering form and active candle display remain directly below the selected day’s prayer.


## v2.4 — Offer Flowers (Novena)
The Novena & Prayers page now contains an **Offer Flowers** area immediately below the separate Novena Candle section. Visitors may offer a symbolic bouquet of red roses with an optional intention, associated with the selected novena day. Flower records use `stonino.v1.novenaFlowers` in guest storage and `novena_flowers` in the optional Supabase profile. The red-rose bouquet asset lives at `assets/novena-rose-bouquet.png`. Flower offerings do not expire automatically. For existing Supabase databases, apply the v2.4 `ALTER TABLE` migration at the bottom of `supabase-schema.sql` before using signed-in flower offerings. All guest data export and deletion functions include flowers.


## v2.5 — Novena initialization and blank-content fix
- The novena day selector, Scripture reference, reflection, and prayer include visible Day 1 fallback text in the HTML.
- Normal JavaScript initialization still replaces fallback text and enables all nine novena days.
- Defensive validation of saved selected day and collection values prevents malformed prior local data from interrupting rendering.
- Storage writes no longer interrupt the app if localStorage is unavailable.
- Cloud synchronization refreshes novena candle and flower galleries upon load.


## v2.6 — Novena display and flowers fix
- Guest-mode application scripts no longer wait for the online Supabase CDN. The Supabase client is loaded only if cloud settings are configured.
- Added an unmistakable `Novena module v2.6` marker just below the Novena introduction to identify out-of-date or mixed files.
- Restored/reserved static first-day buttons, Scripture, reflection, and prayer text; flower offering section remains directly after the novena candle section.
- Added CSS/JavaScript cache-busting version parameters.
- To update, replace the **contents** of your repository with the **contents** inside the ZIP's `sto-nino-devotional` folder; do not create a second nested `sto-nino-devotional` folder. If the v2.6 marker is missing, the browser is still loading an older `index.html`.


## v2.6.1 patch
- Cleaned the bouquet image asset used in the Novena flower offering section to remove a stray vertical line beside the flowers.


## v2.7 Scripture meditation popup
Each Scripture & Meditation reference is clickable. It uses the novena Scripture dialog to fetch the full KJV passage with numbered verses and cache it locally after a successful request. This requires internet access for first use.

## Music Prayers

Place audio recordings in `assets/music/`. File names become the song titles. Run `node build-music-library.mjs` from the package root after changing the recordings. Netlify runs this command during a build.

## Scripture ticker

The ticker uses the public-domain World English Bible text from [TehShrike/world-english-bible](https://github.com/TehShrike/world-english-bible), with the New Testament books in canonical order.

The ticker follows the app's language selection. Cebuano uses Biblica® Open Ang Pulong sa Dios™ (Biblica® Open Cebuano Contemporary Bible™), © 2009, 2010, 2014, 2024 Biblica, Inc. Biblica is a registered trademark of Biblica, Inc. Used with permission. See the [edition and source](https://ebible.org/cebocb/copyright.htm) and [CC BY-SA 4.0 license](https://creativecommons.org/licenses/by-sa/4.0/). Tagalog uses the public-domain Ang Dating Biblia (1905), Philippine Bible Society. Both datasets come from the [Bible JSON repository](https://github.com/thiagobodruk/bible).
