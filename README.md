# Sto. Niño Devotional v1.2.26

The prayers from pages 3–9 of the Basilica’s 2019 Fiesta Señor Pilgrim’s Booklet appear above each day’s Scripture link in English or in the app’s Cebuano and Filipino translations. Novena days unlock in order as each day is marked complete. A day opens only when selected. Opening a day before its scheduled date requires confirmation. Novena candles and flowers can be offered at any time. An open prayer day is recorded with the offering when applicable. To restore date-based prayer access, set `NOVENA_PREVIEW_ENABLED` to `false` in `public/assets/app.js`.

Flowers wilt over seven hours on the Sanctuary, Novena, and Offer Flowers pages. After seven hours, the bouquet disappears from all three displays.

The Sanctuary’s Install App link selects the highest version in `public/assets/apk/` at build time and publishes it in `public/assets/latest-apk.json`. Each Install App click fetches that index without using the browser cache. Add future files as `sto-nino-devotional-MAJOR.MINOR.PATCH-signed.apk` or `sto-nino-devotional-MAJOR.MINOR.PATCH-test-signed.apk`. Netlify runs `npm run build` before publishing. For a manual upload of `public/`, run `npm run build` first.

Prayer Packs display USD prices. GCash checkout uses the fixed peso amount shown before payment. On an existing database, apply `sql/prayer-pack-usd-tiers.sql` before deploying this release if the new tiers have not been enabled yet.

Signed-in users can use Log Out beside My Account in the main header.

## Offering intentions

Novena candles, novena flowers, standalone candles, and standalone flowers share seven intentions. Each intention has seven matching optional prayers and a field to add an optional personal prayer of up to 250 characters. Saved offerings retain their original prayer text. On an existing database, apply `sql/offering-intentions.sql` after any earlier prayer-pack updates and before publishing v1.2.24.

## Release version

Increment the patch version for each web revision unless the release calls for a minor or major version bump. Use the same version in the header badge and install script query in `public/index.html`, the root project metadata in `package.json` and `package-lock.json`, this README heading, and the web ZIP filename. Verify that the app header displays the new version before distributing the package.

## Preview

Run `python3 -m http.server 8000 --directory public` from this folder and open `http://localhost:8000`. This serves the HTML, assets, and web app manifest. Netlify functions require a Netlify environment.

## Deploy on Netlify

1. Extract the ZIP and deploy the extracted directory through a Git-connected Netlify site. Keep `netlify.toml`, `public/`, `netlify/`, `scripts/`, and the npm manifests together. Netlify publishes `public/` and builds the functions in `netlify/functions/`.
2. On the existing site, retain the configured Functions environment variables. On a new site, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server-side payment operations. For payment alert emails, also set `RESEND_API_KEY` and `PRAYER_PACK_EMAIL_FROM`. Keep secrets in Netlify's environment settings. The browser uses the Supabase public configuration in `public/assets/config.js`.
3. If deploying to a different domain, update the Supabase Auth Site URL and redirect allowlist as appropriate. A new database requires schema setup. The SQL files for reference are under `sql/`. Check the applied migrations before running any SQL against an existing database. Existing installations need `sql/novena-offerings-anytime.sql` if this update has not already been applied to the database.
4. Check account access, password reset, Payment Review, and Cancel Claim using a test account on the deployed site.

The bundled payment code defaults to the app's existing GCash Express Send reference review. Sites already using merchant mode must retain their existing merchant environment settings.
