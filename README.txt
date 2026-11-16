Sto. Nino Devotional 1.2.24 Android signing kit
Version code 34 | net.crownmind.stoninodevotional.direct

Extract the kit. Open PowerShell in the extracted folder and run:
powershell -ExecutionPolicy Bypass -File .\sign-v1.2.24.ps1

The script defaults to C:\WorkDir\SigningKeys\StoNinoDevotional-upload.jks.
Use -Keystore with the actual path if needed. Android SDK Build-Tools must
be installed. Enter the keystore and key passwords at the prompts.

The script aligns the APK, signs it, verifies the signature, and compares
the certificate to the v1.2.19 direct-download release. The signed APK
appears beside the script after all checks pass.

This release adds an optional personal prayer field below the preset
prayers in Novena, Candle, and Flowers. Apply sql/offering-intentions.sql
from the matching web package to Supabase before distributing the APK.
The unsigned APK must be signed before installation.
