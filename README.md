# Sto. Niño Devotional v1.2.40

Prayer Packs offer GCash, PayMaya, and PayPal under Payment Mode. PayMaya
shows the corresponding QR for the 50, 150, 250, or 500 credit pack. Members
submit a receipt reference, and an admin verifies the transfer under Payment
Review before credits are added.

## Web deployment

Use the project root as the Netlify base directory. The included netlify.toml
publishes public/ and runs the bundled Netlify Functions. Keep the existing
site environment variables. PayMaya uses the existing Prayer Pack tables and
admin functions. This release adds no database migration.

For a local static preview, run npm run build and serve public/ over HTTP.
Payment operations require the deployed Netlify Functions.

## Direct-download Android release

The web package contains the last signed APK, v1.2.39. Place the separately
downloaded v1.2.40 unsigned APK beside sign-v1.2.40.ps1. Run the script in
PowerShell with the existing Android signing keystore. Pass -Keystore or
-SdkPath if your paths differ from the script defaults.

Place the resulting signed APK in public/assets/apk/ and run npm run build.
The build updates the Install App link to the latest signed APK it finds.
Deploy the updated website and functions so the Android PayMaya checkout can
reach the updated backend.
