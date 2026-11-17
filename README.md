# Sto. Niño Devotional v1.2.31

The web interface was recovered from the signed Android v1.2.27 APK. The Android-only request bridge was removed from the web page so Prayer Pack requests use the Netlify endpoint. Netlify configuration, server functions, build script, and reference SQL come from the v1.2.28 web package.

The Sanctuary hides the Install App link and Android instructions inside the native v1.2.31 APK and when the installed web app is opened in standalone mode. In a regular browser the download remains available. The web package currently includes the signed v1.2.27 APK. After signing v1.2.31, put the signed file in `public/assets/apk/` and run the build to publish it as the latest download.

Reset Days clears completion marks for the displayed Novena schedule and saves the reset to the account. The existing early-opening confirmation applies before Day 1.

## Preview and deployment

Run `npm ci` and `npm run build` from this directory. To preview static pages, run `python3 -m http.server 8000 --directory public` and visit http://localhost:8000. The static preview does not run Netlify functions.

Deploy the extracted project directory with Netlify. Its configuration publishes `public/` and uses `netlify/functions/`. For the existing site, retain its configured environment variables. The `sql/` files are reference migrations. Check your database migration history before applying any of them.
