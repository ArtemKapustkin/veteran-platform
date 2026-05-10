# Demo seed data

`seed.sql` populates the database with a small fixture set for local
development and demos. The script is idempotent (`INSERT … ON CONFLICT
DO UPDATE`), so re-running it is safe and refreshes the demo rows
back to their canonical values.

## What's seeded

| Veteran                          | Phone           | Role    | Verified | City    |
|----------------------------------|-----------------|---------|----------|---------|
| Адмін Адмінович                  | +380500000001   | admin   | yes      | Київ    |
| Іван Петренко (95-та ОДШБр)      | +380500000002   | veteran | yes      | Київ    |
| Олена Шевченко (93-тя ОМБр)      | +380500000003   | veteran | yes      | Львів   |
| Микола Коваль (47-ма ОМБр)       | +380500000004   | veteran | no       | Харків  |
| Марія Ковальчук (родина)         | +380500000005   | veteran | no       | Дніпро  |
| Андрій Бойко (92-га ОМБр)        | +380500000006   | veteran | yes      | Київ    |

Plus 4 communities and 12 events (10 published, 2 pending_approval) covering
all categories, formats, cost tiers, accessibility tags, and Kyiv districts.

## Running

```bash
# from backend/
make seed             # against the running compose Postgres
make reset            # full nuke: down -v, postgres up, migrate, seed
```

`make seed` requires the `postgres` compose service to be running and
all migrations applied. `make reset` does the whole sequence.

## real_events.sql (50 events parsed from public Telegram channels)

`real_events.sql` is a separate idempotent INSERT block with 50 real
event titles + descriptions parsed out of public Telegram channels
(`Київ Мілітарі Хаб|Заходи` and `Ветеран Хаб на зв'язку`). Useful for
demos where you want the FE filter chips to bite on real Ukrainian
content rather than the 12 hand-curated rows in `seed.sql`.

Apply manually after `make seed` (or directly against Cloud SQL):

```bash
docker exec -i veteran-platform-postgres-1 \
  psql -U veteran -d veteran_platform < deployments/seed/real_events.sql
```

`created_by_id` references the prod admin row UUID
`52fc80db-740e-465f-a3ca-d37134e33c31`. For local dev you'll need to
either insert that veteran row first or adjust the SQL to point at a
seeded UUID (e.g. `11111111-…` from `seed.sql`).

The original parser script lived in `/tmp/parse_events.py` and is not
checked in — the SQL output is treated as the canonical artifact.

## Logging in as a seeded user

The OTP flow short-circuits for these phones the same as any other —
request a code via `POST /api/v1/auth/otp/request`, find the code in
the service log (since Twilio is unconfigured by default), then verify.
The admin row already has `role=admin`, so the very first access token
issued for `+380500000001` carries admin claims.
