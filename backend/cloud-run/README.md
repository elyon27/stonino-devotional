# Keyless Play Billing deployment

Run the commands from the repository root in an authenticated Google Cloud CLI shell. The project needs Cloud Billing enabled and a deployer with permission to deploy Cloud Run from source, administer the service accounts and manage the relevant secrets. The region below uses Singapore.

Use the exact Play Billing service account email from Google Cloud in `play_account`. In Google Play Console, grant that identity the permissions needed to verify and consume one-time purchases for `net.crownmind.stoninodevotional.direct`. Keep the existing organization policy enforced.

```bash
project=sto-nino-devotional
region=asia-southeast1
play_account=sto-nino-play-billing@$project.iam.gserviceaccount.com
runtime_account=sto-nino-play-verifier@$project.iam.gserviceaccount.com

gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com \
  iamcredentials.googleapis.com androidpublisher.googleapis.com --project="$project"

gcloud iam service-accounts create sto-nino-play-verifier --project="$project"
gcloud iam service-accounts add-iam-policy-binding "$play_account" \
  --project="$project" --member="serviceAccount:$runtime_account" \
  --role=roles/iam.serviceAccountTokenCreator
```

In [Secret Manager](https://console.cloud.google.com/security/secret-manager?project=sto-nino-devotional), create the following secrets with an enabled version. Grant the runtime account **Secret Manager Secret Accessor** on each secret individually.

| Secret | Value |
| --- | --- |
| `stonino-supabase-url` | The same Supabase project URL used by the existing Netlify site |
| `stonino-supabase-service-role-key` | The server-side service role key for that project |
| `stonino-play-account-secret` | The existing `PLAY_BILLING_ACCOUNT_SECRET`, if configured. For a first deployment, generate a stable random value, for example with `openssl rand -hex 32`. |

Changing an existing account secret changes the account IDs embedded in previous purchases. Apply `backend/sql/prayer-pack-google-play.sql` to the existing Supabase project before testing credit delivery.

```bash
gcloud run deploy stonino-play-billing --project="$project" --region="$region" \
  --source=backend/cloud-run --service-account="$runtime_account" \
  --allow-unauthenticated --min-instances=0 --max-instances=3 \
  --set-env-vars="PLAY_BILLING_CLIENT_EMAIL=$play_account" \
  --set-secrets="SUPABASE_URL=stonino-supabase-url:latest,SUPABASE_SERVICE_ROLE_KEY=stonino-supabase-service-role-key:latest,PLAY_BILLING_ACCOUNT_SECRET=stonino-play-account-secret:latest"
```

Netlify reaches the Cloud Run HTTPS endpoint without Google IAM invocation credentials. The verifier requires a valid Supabase user access token and rejects anonymous users before it calls Google or issues credits. The Cloud Run runtime account mints a short-lived token with the Google Play scope. Its token-creation permission applies only to the designated Play Billing service account.

Set `PLAY_BILLING_VERIFIER_URL` to the Cloud Run HTTPS origin (the `run.app` URL, without a path) in the Netlify production Functions environment, then deploy this repository to the existing site. The existing Android build continues to use `/.netlify/functions/play-prayer-packs`.

Confirm that a POST without an authorization header returns `401` through both endpoints. Then test a license-test purchase from the internal Play track and verify credit delivery, consumption and retry behavior before releasing publicly.
