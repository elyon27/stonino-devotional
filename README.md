# Sto. Niño Devotional v1.2.38

The web interface was recovered from the signed Android v1.2.27 APK. The Android-only request bridge was removed from the web page so Prayer Pack requests use the Netlify endpoint. Netlify configuration, server functions, build script, and reference SQL come from the v1.2.28 web package.

The Sanctuary hides the Install App link and Android instructions inside the native v1.2.31 APK and when the installed web app is opened in standalone mode. In a regular browser the download remains available. The web package currently includes the signed v1.2.27 APK. After signing a newer APK, put the signed file in `public/assets/apk/` and run the build to publish it as the latest download.

Reset Days clears completion marks for the displayed Novena schedule and saves the reset to the account. The existing early-opening confirmation applies before Day 1.

The **3D Sto. Nino** card follows **Sto. Nino Pictures** in the Sanctuary grid. The **3D Sto. Nino** entry in the desktop and mobile navigation opens the looping GIF from `public/assets/santo-nino-360.gif`. The matching PowerShell signing script is included as `sign-v1.2.34.ps1` for use with the v1.2.34 Android build.

## Preview and deployment

Run `npm ci` and `npm run build` from this directory. To preview static pages, run `python3 -m http.server 8000 --directory public` and visit http://localhost:8000. The static preview does not run Netlify functions.

Deploy the extracted project directory with Netlify. Its configuration publishes `public/` and uses `netlify/functions/`. For the existing site, retain its configured environment variables. The `sql/` files are reference migrations. Check your database migration history before applying any of them.

## Prayer Pack checkout

Each Prayer Pack offers GCash in PHP and PayPal in USD. GCash charges ₱50,
₱150, ₱250, or ₱500 for the corresponding number of credits. Direct GCash
payments use the recipient QR and the member submits a transaction reference
for Payment Review. Deployments that configure merchant mode retain QR Ph
checkout and server-side payment verification. PayPal charges $1, $3, $5,
or $10, and the server verifies the capture before adding credits.

Set these environment variables for Netlify Functions:

- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from the PayPal REST app.
- `PAYPAL_MODE` set to `live` for production or `sandbox` for a test deployment.
- `PAYPAL_RETURN_URL` set to the HTTPS app URL for that deployment.

Use a separate Supabase test database for sandbox checkout. Retain the existing
Supabase credentials and Prayer Pack settlement function in production. Test
approval, cancellation, and repeated balance refresh with sandbox accounts
before switching production to live credentials. Keep credentials in Netlify
and out of GitHub.
