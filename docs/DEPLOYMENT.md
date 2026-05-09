# Deployment

How to run the platform on the public internet, given:

- **Frontend**: Next.js on **Vercel** (already chosen)
- **Backend**: this Go service (Dockerised)
- **Eventual home**: Ministry of Veterans Ukraine

## Architecture

```
┌─────────────────────┐
│ Browser / mobile    │
└──────────┬──────────┘
           │
           ├──── https://app.veteran-platform.gov.ua  ─────┐
           │            (DNS + TLS by Vercel)              │
           │                                               ▼
           │                                       ┌────────────────┐
           │                                       │ Vercel         │
           │                                       │ Next.js        │
           │                                       └────────┬───────┘
           │                                                │ XHR
           │ ◄──────────────────────────────────────────────┘
           │
           ├──── https://api.veteran-platform.gov.ua ──────┐
           │            (DNS by Vercel,                    │
           │             TLS by Fly.io / Let's Encrypt)    │
           ▼                                               ▼
   ┌─────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ Fly.io              │→ │ Twilio API       │  │ OpenAI Platform  │
   │ Backend (Dockerised)│  │ (SMS)            │  │ (Vision)         │
   └──────────┬──────────┘  └──────────────────┘  └──────────────────┘
              │
              │ TLS (libpq, sslmode=require)
              ▼
   ┌─────────────────────┐
   │ Neon                │
   │ Managed Postgres    │
   │ (EU region)         │
   └─────────────────────┘
```

Vercel is the single DNS authority for the apex and both subdomains.
For `app.*` it terminates TLS itself; for `api.*` the CNAME points to
Fly.io which terminates TLS via its own Let's Encrypt cert. No
intermediate CDN needed unless you want one (see "Optional: Cloudflare"
below).

## Recommended stack

| Layer        | Service        | Why                                                                        |
|--------------|----------------|----------------------------------------------------------------------------|
| Frontend     | **Vercel**     | Already chosen. Free for Hobby; instant Next.js deploys; preview branches. **Also acts as the DNS authority** for the apex + both subdomains. |
| Backend      | **Fly.io**     | Deploy a Dockerfile in 60s (`fly launch`). EU regions including Warsaw (`waw`) for low UA latency. Free allowance covers a small instance; ~$5–10/mo per machine after. Auto-TLS via Let's Encrypt, secrets manager, easy multi-region scale. |
| Database     | **Neon**       | Serverless Postgres with branching (instant staging copies for migration testing). EU regions. Free tier 512 MB; ~$19/mo for production. PITR built in. |
| SMS          | **Twilio**     | Already coded. Trial works for verified numbers; ~$0.025/SMS to Ukraine after upgrade. |
| AI vision    | **OpenAI**     | Already coded. ~$0.005 per verification with `gpt-4o`. |
| Errors       | Sentry (opt.)  | 5k events/mo free. |
| Logs         | Fly.io built-in or Better Stack | Aggregate `slog` JSON output. |

### Why this stack and not alternatives

| Alternative        | Trade-off |
|--------------------|-----------|
| AWS ECS / RDS      | More flexible long-term, but takes 5-10× the time to set up and bills per hour. Pick this only if the Ministry already has AWS infra. |
| Railway / Render   | Simpler than Fly.io but historically slower cold starts; no Warsaw region. Fine for staging. |
| Supabase Postgres  | Adds auth/storage you don't need (you already have OTP+JWT). Use Neon for "just Postgres". |
| Self-hosted Hetzner| Cheapest by far; requires you to run Postgres + TLS yourself. Pick this only if you have an ops engineer. |

## Pre-prod checklist

These items are **not in the codebase yet** and need to be added before
public deploy. Each is small.

1. **CORS middleware** — currently absent. Add an env-driven allowlist
   (e.g. `CORS_ALLOWED_ORIGINS=https://app.veteran-platform.gov.ua`)
   and wire it into `pkg/server/server.go` before the router. Reject
   wildcard `*` in prod.
2. **JWT secret** — generate a real 32-byte random and store as
   Fly.io secret. Do **not** ship the dev default.
3. **Postgres SSL** — change `DSN()` to `sslmode=require` for prod
   (Neon enforces TLS).
4. **Body size limits** — already 16 MB; safe for document uploads.
5. **Rate limiting beyond OTP** — consider a global per-IP limiter
   (e.g. token-bucket middleware) on `/auth/*` and `/me/verification`.
   Not strictly required at hackathon scale.
6. **Trusted proxy headers** — when behind Cloudflare, configure
   fasthttp to read client IP from `CF-Connecting-IP`.
7. **Structured request logging** — `pkg/server` logs panics but not
   every request. Add a small middleware that emits one slog line per
   request with method/path/status/duration.
8. **Backups** — Neon does PITR by default; verify retention matches
   what you need (default 7 days on free, 30 on Pro).
9. **Twilio production account** — trial only sends to verified
   numbers. Upgrade once you're ready for real users.
10. **OpenAI usage limits** — set a monthly hard cap in the OpenAI
    dashboard so a misconfigured loop can't drain budget.

## Deploy step-by-step

### One-time

1. Create accounts on Fly.io, Neon, Cloudflare, Twilio (paid), OpenAI.
2. Buy `veteran-platform.gov.ua` (or whatever apex), point nameservers
   to Cloudflare.
3. Provision Neon project in EU region. Copy the `psql` connection
   string — Neon gives you a single URL with sslmode=require.
4. `flyctl launch` from inside `backend/` — Fly auto-detects the
   `Dockerfile`, generates `fly.toml`. Choose Warsaw (`waw`) region.
5. Set Fly secrets:

   ```bash
   flyctl secrets set \
     DB_HOST=ep-xxxxx.eu-central-1.aws.neon.tech \
     DB_PORT=5432 \
     DB_USER=veteran_app \
     DB_PASS=...generated... \
     DB_NAME=veteran_platform \
     JWT_SECRET=$(openssl rand -base64 48) \
     TWILIO_ACCOUNT_SID=AC... \
     TWILIO_AUTH_TOKEN=... \
     TWILIO_FROM=+1... \
     OPENAI_API_KEY=sk-... \
     CORS_ALLOWED_ORIGINS=https://app.veteran-platform.gov.ua
   ```
6. **One-shot migration**: SSH into the Fly machine and run
   `./backend migrate` (or run a release command — `fly.toml` supports
   `[deploy] release_command = './backend migrate'` so it runs on every
   deploy).
7. Bootstrap the first admin: SSH in and run `./backend promote-admin
   +380XXXXXXXXX`. After that, the admin can sign in with their phone
   and the access token will carry admin claims.
8. **DNS via Vercel.** In the Vercel project for the frontend:
   - Add `veteran-platform.gov.ua` (apex) and `app.veteran-platform.gov.ua`
     as custom domains. Vercel issues TLS certificates and routes traffic
     to the Next.js deployment automatically.
   - Under **Domains → DNS Records**, add a `CNAME` for `api` pointing
     to `your-app.fly.dev`. Fly.io's Let's Encrypt cert covers TLS for
     this hostname (run `flyctl certs create api.veteran-platform.gov.ua`
     to provision it).
9. In Vercel env vars, set `NEXT_PUBLIC_API_BASE=https://api.veteran-platform.gov.ua`.

### Each deploy

```bash
# Backend (from veteran-platform/backend)
flyctl deploy

# Frontend
git push origin main          # Vercel auto-deploys
```

## Region & latency

For Ukrainian users, prioritise:

- Backend in **Warsaw** (Fly `waw`) or **Frankfurt** (`fra`) → 30-50 ms
  to Kyiv.
- Postgres in **eu-central-1** Neon (Frankfurt) → ~5 ms from Fly
  Frankfurt.
- Cloudflare automatically serves from Kyiv / Lviv PoPs.

If the platform is later mandated to host inside Ukraine for legal
reasons, swap Fly.io for a Ukrainian VPS (e.g. **Hetzner Helsinki + a
Ukrainian peering**, or De Novo / Tucha if a Ukrainian provider is
required). The Dockerfile is already platform-agnostic.

## Optional: Cloudflare in front of `api.*`

Vercel handles DNS and TLS perfectly for the basic case. Add Cloudflare
between the browser and Fly.io only if you need one of:

- **DDoS protection** beyond Fly.io's defaults — useful once the platform
  is public-facing and tied to a government brand.
- **WAF rules** (rate limit by URL path, block by country, challenge
  bots) — Cloudflare's free tier covers basic rules; Pro ($20/mo) adds
  the full WAF.
- **Edge caching** of public endpoints (`GET /events`,
  `GET /reference/*`). Currently the backend serves these uncached;
  putting Cloudflare in front and adding `Cache-Control` headers would
  cut load and latency.

If you add Cloudflare, you have two choices:

1. **Move DNS authority entirely to Cloudflare** (point the registrar's
   nameservers at Cloudflare) — then Vercel uses Cloudflare's DNS via
   external records, and `api` is a proxied CNAME. Slightly more setup,
   gives you the Cloudflare dashboard for everything.
2. **Keep DNS on Vercel and put Cloudflare only in front of `api.*`** —
   harder to configure (you'd use Cloudflare-as-CDN-only mode with a
   different hostname), and not worth it. If you go Cloudflare, prefer
   option 1.

For a v1 launch, skip Cloudflare. Add it once you see real traffic and
have a reason.

## Cost (rough monthly)

| Item | Hobby | Production |
|---|---|---|
| Fly.io backend | $0 (free tier) | $10 (1× shared-cpu-1x with 1 GB) |
| Neon Postgres  | $0 (512 MB) | $19 (10 GB, autoscaling) |
| Vercel         | $0 | $20 (Pro, custom domain SLA, includes DNS) |
| Cloudflare *(optional)* | $0 | $0 (free tier) — $20 if you want full WAF |
| Twilio SMS     | usage | $0.025 × #SMS |
| OpenAI Vision  | usage | $0.005 × #verifications |
| **Fixed**      | **$0** | **~$50/mo** + per-message and per-verification |

## Operational notes

- **Single backend instance is fine** for hackathon → public launch.
  fasthttp comfortably handles thousands of req/s on one shared CPU.
  When you need HA, set Fly to 2 machines in the same region; the
  registration expirer is idempotent under concurrent ticks.
- **DB migrations run as a release_command** — Fly only switches
  traffic to the new image after migrate succeeds, so a broken
  migration never reaches users.
- **Secret rotation** — `JWT_SECRET` rotation invalidates all access
  tokens. Refresh tokens still work (they're hashed in DB, not signed),
  so users get a fresh access token on next refresh. Plan to rotate
  quarterly.
- **AI cost guardrail** — until you trust the verification rate, set
  OpenAI hard cap at $20/mo. With 4000 verifications/mo at $0.005,
  that's $20 — generous for a Ministry-scale rollout v1.
