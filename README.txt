Sto. Nino Devotional 1.2.21 Android signing kit
Version code 31 | net.crownmind.stoninodevotional.direct

Extract the kit. Open PowerShell in the extracted folder and run:
powershell -ExecutionPolicy Bypass -File .\sign-v1.2.21.ps1

The script defaults to C:\WorkDir\SigningKeys\StoNinoDevotional-upload.jks.
Use -Keystore with the actual path if needed. Android SDK Build-Tools must
be installed. Enter the keystore and key passwords at the prompts.

The script aligns the APK, signs it, verifies the signature, and compares
the certificate to the v1.2.19 direct-download release. The signed APK
appears beside the script after all checks pass.

The mobile footer swipes horizontally. Music, Scripture, and Picture
follow Prayers. Picture opens the bundled gallery. The unsigned APK
must be signed before installation.
