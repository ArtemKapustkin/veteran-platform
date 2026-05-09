# Full GCP setup

End-to-end guide to running the backend on Cloud Run with Cloud SQL Postgres
+ Cloud Storage for event-cover uploads + Secret Manager for credentials.
Tuned for hackathon speed; production hardening notes called out where they
matter.

## 0. Prerequisites

- A GCP project with billing enabled (the $300 free credit covers everything
  here for ~6 months at hackathon scale)
- `gcloud` CLI authed (`gcloud auth login`), or you can do everything via the
  web console — both shown below
- These shell variables, so the copy-paste blocks work:

```bash
export GCP_PROJECT=$(gcloud config get-value project)
export GCP_REGION=europe-central2          # Warsaw — closest to Ukraine
export GCP_SERVICE=veteran-platform-backend
```

## 1. Enable APIs (one-time)

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com
```

Or in the console: **APIs & Services → Library** → enable each by name.

## 2. Cloud SQL Postgres

### 2a. Create the instance

Console: https://console.cloud.google.com/sql/instances → **CREATE INSTANCE**
→ **PostgreSQL**.

| Field | Value |
|---|---|
| Instance ID | `vp-pg` |
| `postgres` user password | strong random; **save for step 5** |
| Database version | **PostgreSQL 16** |
| Region | **europe-central2** (Warsaw) — same as Cloud Run |
| Zonal availability | Single zone (cheaper for hackathon) |
| Machine type | **Shared core → db-f1-micro** (~$7/mo) |
| Storage | **10 GB SSD** |
| Connections | **Public IP enabled**, leave Authorized networks empty *for now* |

Click **CREATE INSTANCE**. Provisioning takes ~5 min.

### 2b. Database and working user

Once the instance is ready:

- **Databases tab → CREATE DATABASE**: name `veteran_platform`, default charset.
- **Users tab → ADD USER ACCOUNT**: username `veteran`, password (save it).
  This is the user the app connects as.

### 2c. Allow Cloud Run to reach it

Two paths — pick the easier one:

**Easy (5 min): public IP + sslmode=require**

- **Connections tab → Networking → Authorized networks → ADD A NETWORK**
- Name: `cloud-run-egress`
- Network: `0.0.0.0/0`
- **SAVE**

> `0.0.0.0/0` is broad. The user password + `sslmode=require` are the actual
> security boundary. Acceptable for hackathon. Production hardening: move to
> private IP via Serverless VPC Access (~10 extra minutes; skip for now).

**Get the public IP**: Cloud SQL → `vp-pg` → **Overview → Public IP address**.
Copy it for step 5.

## 3. Cloud Storage bucket (event covers)

### 3a. Create the bucket

Console: https://console.cloud.google.com/storage/browser → **CREATE**.

| Field | Value |
|---|---|
| Name | `veteran-platform-uploads` (must be globally unique — prepend project ID if taken) |
| Location type | Region → `europe-central2` |
| Storage class | Standard |
| Access control | **Uniform** (not fine-grained) |
| Public access prevention | **OFF** (we serve cover images publicly) |

Click **CREATE**.

### 3b. Make objects publicly readable

After creation: **PERMISSIONS → GRANT ACCESS**.

| Field | Value |
|---|---|
| New principals | `allUsers` |
| Role | **Storage Object Viewer** |

Confirm the public access warning. Now any object in the bucket is reachable
at `https://storage.googleapis.com/<bucket>/<key>`.

### 3c. Grant Cloud Run write access

Find the Cloud Run service account: open the service in Cloud Run UI →
**Details → Security → Service account**. Default is
`<project-number>-compute@developer.gserviceaccount.com`.

On the bucket: **PERMISSIONS → GRANT ACCESS**:

| Field | Value |
|---|---|
| New principals | `<that SA>` |
| Role | **Storage Object Creator** |

(`Storage Object Viewer` is already covered by allUsers, so no need to add it
to the SA again.)

## 4. Secret Manager — four credentials

Open https://console.cloud.google.com/security/secret-manager and create
four secrets the same way you created `OPENAI_ASSISTANT_ID`:

| Secret name | Value |
|---|---|
| `DB_PASS` | the password set for the `veteran` user in 2b |
| `JWT_SECRET` | run `openssl rand -base64 48` and paste the output |
| `TWILIO_AUTH_TOKEN` | from your `.env` |
| `OPENAI_API_KEY` | OpenAI API key (`sk-...`) |

(`OPENAI_ASSISTANT_ID` already exists from earlier.)

You don't need to grant IAM bindings here — Cloud Run's "Reference a Secret"
UI auto-grants when you mount each one in step 5.

## 5. Cloud Run service config

Open the Cloud Run service → **EDIT & DEPLOY NEW REVISION** →
**Variables & Secrets** tab.

### 5a. Plain env vars (click `+ ADD VARIABLE` for each)

```
HTTP_PORT=8088
LOG_LEVEL=info
AUTH_ACCESS_TTL=15m
AUTH_REFRESH_TTL=720h
OTP_LENGTH=6
OTP_TTL=5m

DB_HOST=<cloud-sql-public-ip-from-2c>
DB_PORT=5432
DB_USER=veteran
DB_NAME=veteran_platform
DB_SSLMODE=require

TWILIO_ACCOUNT_SID=AC...                   # your SID from console.twilio.com
TWILIO_FROM=+1...                          # your sender number from Twilio

GCS_BUCKET=<bucket-name-from-3a>
```

`UPLOADS_LOCAL_DIR` and `UPLOADS_PUBLIC_BASE` are local-mode only — skip.

### 5b. Secret references (click `+ REFERENCE A SECRET` five times)

| Secret | Reference method | Env var name | Version |
|---|---|---|---|
| `DB_PASS` | Exposed as env var | `DB_PASS` | latest |
| `JWT_SECRET` | Exposed as env var | `JWT_SECRET` | latest |
| `TWILIO_AUTH_TOKEN` | Exposed as env var | `TWILIO_AUTH_TOKEN` | latest |
| `OPENAI_API_KEY` | Exposed as env var | `OPENAI_API_KEY` | latest |
| `OPENAI_ASSISTANT_ID` | Exposed as env var | `OPENAI_ASSISTANT_ID` | latest |

Click **GRANT** on each yellow IAM banner.

### 5c. Connections tab

- **Cloud SQL connections → ADD CONNECTION** → select `vp-pg`.

> Adds Cloud SQL to the service definition. With public IP + sslmode=require
> we don't strictly need it, but adding it now makes the future swap to
> Unix-socket private connectivity cheaper. Doesn't hurt anything.

### 5d. Deploy

Bottom of the page → **DEPLOY**. New revision rolls out in ~30 s.

Open **LOGS** and look for these five lines (in any order):

```
db connected            host=<the-public-ip>  name=veteran_platform
http server starting    addr=:8088
registration expirer started
storage: gcs            bucket=<your-bucket>
aivision: openai assistants v2  assistant_id=asst_…
```

If all five appear, the service is wired correctly.

## 6. Run migrations

The DB is still empty. Use a one-shot Cloud Run **Job** to run `migrate`.

```bash
IMAGE=$(gcloud run services describe $GCP_SERVICE --region $GCP_REGION \
  --format='value(spec.template.spec.containers[0].image)')

gcloud run jobs create vp-migrate \
  --region $GCP_REGION \
  --image $IMAGE \
  --command /backend \
  --args migrate \
  --set-env-vars="DB_HOST=<public-ip>,DB_PORT=5432,DB_USER=veteran,DB_NAME=veteran_platform,DB_SSLMODE=require,LOG_LEVEL=info" \
  --set-secrets="DB_PASS=DB_PASS:latest"

gcloud run jobs execute vp-migrate --region $GCP_REGION --wait
```

Output should end with `migrated to group #N (...)`.

### Optional: seed demo data + promote admin

```bash
# Idempotent demo seed
gcloud sql connect vp-pg --user=veteran --database=veteran_platform \
  < backend/deployments/seed/seed.sql

# Promote a phone you control to admin role
gcloud run jobs create vp-promote-admin \
  --region $GCP_REGION \
  --image $IMAGE \
  --command /backend \
  --args promote-admin,+380XXXXXXXXX \
  --set-env-vars="DB_HOST=<public-ip>,DB_PORT=5432,DB_USER=veteran,DB_NAME=veteran_platform,DB_SSLMODE=require,LOG_LEVEL=info" \
  --set-secrets="DB_PASS=DB_PASS:latest"

gcloud run jobs execute vp-promote-admin --region $GCP_REGION --wait
```

## 7. Smoke test

```bash
URL=$(gcloud run services describe $GCP_SERVICE --region $GCP_REGION \
  --format='value(status.url)')

curl -sS $URL/healthz
# {"status":"ok"}

curl -sS $URL/api/v1/reference/event-categories | head -c 200
# JSON with 9 categories
```

Then run an upload through the deployed service:

```bash
# Get a veteran token first — request OTP, check Twilio SMS, verify, etc.
# Then:
curl -sS -X POST -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/test.jpg" \
  $URL/api/v1/me/uploads/event-cover

# {"url":"https://storage.googleapis.com/<bucket>/event-covers/<uuid>.jpg"}
```

Open that URL in a browser — should render the image. If yes: full chain
works (Cloud Run → GCS → public read).

## 8. Common failures

| Symptom | Fix |
|---|---|
| `db ping: dial tcp <ip>:5432: connect: connection refused` | Cloud SQL Authorized Networks doesn't include `0.0.0.0/0`. Re-check 2c. |
| `db ping: SSL is required` | `DB_SSLMODE=require` missing or set to `disable`. |
| `permission denied for relation "vp_migrations"` | `veteran` user missing privileges. Cloud SQL UI: **Users → ⋮ on `veteran` → Edit → grant superuser** or run `GRANT ALL PRIVILEGES ON DATABASE veteran_platform TO veteran`. |
| Upload returns `permission denied: storage.objects.create` | Cloud Run SA missing **Storage Object Creator** on the bucket. Re-check 3c. |
| Image URL returns `403` in browser | `allUsers` missing **Storage Object Viewer** on the bucket. Re-check 3b. |
| `aivision: stub (...)` in logs after deploy | `OPENAI_API_KEY` or `OPENAI_ASSISTANT_ID` secret not mounted. Re-check 5b. |

## 9. Redeploying after code changes

If you used the **Launch from GitHub** wizard for the initial deploy, Cloud
Build watches the repo and a `git push origin main` rebuilds + rolls out a
new revision automatically. Otherwise:

```bash
gcloud run deploy $GCP_SERVICE --source ./backend --region $GCP_REGION
```

Migrations after schema changes:

```bash
gcloud run jobs execute vp-migrate --region $GCP_REGION --wait
```

(Make migrations additive — new tables / nullable columns — to avoid the
"old revision is still serving" race during rollout.)

## 10. Production hardening (later)

These weren't done above because they slow down a hackathon, but they matter
once real users / Ministry data are in play:

- **Cloud SQL private IP + Serverless VPC Access connector** — removes the
  `0.0.0.0/0` allowlist; the only path to the DB is from inside the VPC.
- **Switch DB driver to `pgx`** + use Cloud Run `--add-cloudsql-instances`
  with Unix sockets — IAM database authentication, no DB password to rotate.
- **Cloud SQL backups** — bump retention from 7d default to 30d, enable PITR.
- **Cloud Run min-instances=1** if cold-start latency matters; +$10/mo.
- **Cloud Logging exclusion filters** so PII fields (phone, fullname) never
  hit cheap storage.
- **OpenAI usage cap** in OpenAI dashboard (e.g. $20/mo) so a misconfigured
  loop can't drain budget.
- **JWT_SECRET rotation policy** — quarterly. Rotation invalidates access
  tokens but leaves refresh tokens working (they're hashed in DB, not
  signed).
