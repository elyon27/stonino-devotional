# Sto. Niño Devotional v1.2.8

The English prayers from pages 3–9 of the Basilica’s 2019 Fiesta Señor Pilgrim’s Booklet appear above each day’s Scripture link. Novena days unlock in order as each day is marked complete. A day opens only when selected. Opening a day before its scheduled date requires confirmation. Novena candle and flower offerings open on their scheduled dates. To restore date-based prayer access, set `NOVENA_PREVIEW_ENABLED` to `false` in `public/assets/app.js`.

## Release version

Increment the patch version for each web revision unless the release calls for a minor or major version bump. Use the same version in the header badge and install script query in `public/index.html`, the root project metadata in `package.json` and `package-lock.json`, this README heading, and the web ZIP filename. Verify that the app header displays the new version before distributing the package.

## Preview

Run `python3 -m http.server 8000 --directory public` from this folder and open `http://localhost:8000`. This serves the HTML, assets, and web app manifest. Netlify functions require a Netlify environment.

## Deploy on Netlify

1. Extract the ZIP and deploy the extracted directory through a Git-connected Netlify site. Keep `netlify.toml`, `public/`, `netlify/`, and the npm manifests together. Netlify publishes `public/` and builds the functions in `netlify/functions/`.
2. On the existing site, retain the configured Functions environment variables. On a new site, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server-side payment operations. For payment alert emails, also set `RESEND_API_KEY` and `PRAYER_PACK_EMAIL_FROM`. Keep secrets in Netlify's environment settings. The browser uses the Supabase public configuration in `public/assets/config.js`.
3. If deploying to a different domain, update the Supabase Auth Site URL and redirect allowlist as appropriate. A new database requires schema setup. The SQL files for reference are under `sql/`. Check the applied migrations before running any SQL against an existing database.
4. Check account access, password reset, Payment Review, and Cancel Claim using a test account on the deployed site.

The bundled payment code defaults to the app's existing GCash Express Send reference review. Sites already using merchant mode must retain their existing merchant environment settings.
