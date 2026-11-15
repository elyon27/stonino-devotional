# Sto. Niño Devotional v1.2.3

The web package carries the interface and assets bundled with the v1.2.3 Android release. The browser uses the matching web payment code to reach same-origin Netlify functions. The Cancel Claim fix is included.

## Preview

Run `python3 -m http.server 8000 --directory public` from this folder and open `http://localhost:8000`. This serves the HTML, assets, and web app manifest. Netlify functions require a Netlify environment.

## Deploy on Netlify

1. Extract the ZIP and deploy the extracted directory through a Git-connected Netlify site. Keep `netlify.toml`, `public/`, `netlify/`, and the npm manifests together. Netlify publishes `public/` and builds the functions in `netlify/functions/`.
2. On the existing site, retain the configured Functions environment variables. On a new site, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for server-side payment operations. For payment alert emails, also set `RESEND_API_KEY` and `PRAYER_PACK_EMAIL_FROM`. Keep secrets in Netlify's environment settings. The browser uses the Supabase public configuration in `public/assets/config.js`.
3. If deploying to a different domain, update the Supabase Auth Site URL and redirect allowlist as appropriate. A new database requires schema setup. The SQL files for reference are under `sql/`. Check the applied migrations before running any SQL against an existing database.
4. Check account access, password reset, Payment Review, and Cancel Claim using a test account on the deployed site.

The bundled payment code defaults to the app's existing GCash Express Send reference review. Sites already using merchant mode must retain their existing merchant environment settings.
