Sto. Niño Devotional v1.2.48 for Google Play

Application ID: net.crownmind.stoninodevotional.direct
Version code: 58. Confirm 58 exceeds every version already uploaded for this
application ID in Play Console.
Target SDK: 36. Google Play Billing Library: 8.2.1.

Sign the unsigned AAB with the upload key registered for this Play Console app.
From the extracted folder in PowerShell, run:

powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\sign-aab-v1.2.48.ps1" -Keystore "C:\SigningKeys\sto-nino-devotional\StoNinoDevotional-upload.jks" -KeyAlias "stonino-upload"

Change the keystore path and alias if your registered Play upload key differs.
Use Play Console's internal testing track for the signed AAB.

Before testing Prayer Packs:
1. Apply backend/sql/prayer-pack-google-play.sql to the existing devotional
   Supabase project. The SQL depends on the existing Prayer Pack tables.
2. Copy backend/netlify/functions/play-prayer-packs.mjs to the app's Netlify
   source at netlify/functions/play-prayer-packs.mjs.
3. Enable the Google Play Android Developer API. Give its service account
   access to manage purchases for this package in Play Console. Configure
   PLAY_BILLING_CLIENT_EMAIL, PLAY_BILLING_PRIVATE_KEY, and a stable random
   PLAY_BILLING_ACCOUNT_SECRET of at least 32 characters as Netlify server
   environment variables. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must
   point to the existing devotional backend. Deploy to the existing host
   stonino-devotional.netlify.app. Keep all credentials on the server.
4. Create and activate one one-time buy option per product in Play Console:
   prayer_pack_50, prayer_pack_150, prayer_pack_250, prayer_pack_500.
   Use the desired regional pricing. The app displays Google Play's prices.
5. Install from the internal track with a license tester. Test cancellation,
   pending purchase recovery, account binding, credit delivery, and repeat
   purchase. Confirm the delivery retry cannot add duplicate credits.

The Play build bundles the supplied review cut v4 and its photo credits.
The web and direct-download editions are separate distributions.
