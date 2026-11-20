# Sto. Niño Devotional v1.2.44

Prayer Packs offer GCash, PayMaya, and PayPal under Payment Mode. PayMaya
shows the corresponding QR for the 50, 150, 250, or 500 credit pack. Members
submit a receipt reference, and an admin verifies the transfer under Payment
Review before credits are added.

Novena, Candles, Flowers, Prayers, Music, and Scripture show the Sanctuary
portrait and current offerings in a fixed header while the page scrolls below.

## Web deployment

Use the project root as the Netlify base directory. The included netlify.toml
publishes public/ and runs the bundled Netlify Functions. Keep the existing
site environment variables. PayMaya uses the existing Prayer Pack tables and
admin functions. Apply `sql/prayer-pack-starter-credits.sql` to the Sto. Niño
project before publishing the web update. Each signed-in account receives
10 credits once, added to its existing balance.

For a local static preview, run npm run build and serve public/ over HTTP.
Payment operations require the deployed Netlify Functions.

## Direct-download Android release

Install App downloads the included signed Android APK v1.2.41. The fixed
header is part of the v1.2.44 web release.
