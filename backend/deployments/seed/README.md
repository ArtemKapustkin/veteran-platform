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

…plus three veterans seeded with `verification_status = 'pending_review'`
(Олександр Мельник, Світлана Гайдамака, Дмитро Захарчук) and matching
`verification_attempts` rows, so the admin verifications screen has a
realistic queue of AI failure modes (`unreadable`, `no_match`, upstream
error) to render against.

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

## Real-data overlay (50 events from public Telegram channels)

Four supplementary files load 50 real events parsed out of two public
Telegram channels (`Київ Мілітарі Хаб|Заходи` and `Ветеран Хаб на зв'язку`)
plus the supporting rows they depend on. Useful for demos where you want
the FE filter chips and seat counters to bite on real Ukrainian content
rather than the 12 hand-curated rows in `seed.sql`.

Apply in this order (each is idempotent — `INSERT … ON CONFLICT DO UPDATE`):

```bash
for f in extra_veterans.sql source_communities.sql real_events.sql real_registrations.sql; do
  docker exec -i veteran-platform-postgres-1 \
    psql -U veteran -d veteran_platform < deployments/seed/$f
done
```

| File | Inserts | Notes |
|---|---|---|
| `extra_veterans.sql` | 14 non-admin seed veterans | Acts as the registrant pool. Uses the same UUIDs (`22222222-…` … `ffffffff-…`) as `seed.sql` so it's harmless to layer on top. |
| `source_communities.sql` | 2 communities for the source TG channels | `a0000005-…` = Київ Мілітарі Хаб, `a0000006-…` = Ветеран Хаб. |
| `real_events.sql` | 50 events | Real Kyiv venues + addresses (5 per category) with accurate lat/lng so map pins land where you'd expect. `community_id` points to whichever channel the event came from; `created_by_id` references the prod admin row `52fc80db-…`. Past dates shifted +1 year so events appear upcoming in the demo. |
| `real_registrations.sql` | ~415 registrations + sync of `events.seats_taken` | Distribution: 10% empty, 30% low, 30% half, 20% nearly full, 10% full (capped at 14 by available registrants). Gives the UI realistic counters like 6/12, 14/30, 0/30 etc. |

For local dev `created_by_id` and the `52fc80db-…` admin row don't exist
unless you inserted it manually — either create that row first or
search-and-replace the UUID with `11111111-…-111111111111` (the seed
admin from `seed.sql`).

The original parser script lived in `/tmp/parse_v2.py` and is not
checked in — the SQL outputs are treated as the canonical artifacts.

## Logging in as a seeded user

The OTP flow short-circuits for these phones the same as any other —
request a code via `POST /api/v1/auth/otp/request`, find the code in
the service log (since Twilio is unconfigured by default), then verify.
The admin row already has `role=admin`, so the very first access token
issued for `+380500000001` carries admin claims.
