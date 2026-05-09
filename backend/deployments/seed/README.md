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

## Logging in as a seeded user

The OTP flow short-circuits for these phones the same as any other —
request a code via `POST /api/v1/auth/otp/request`, find the code in
the service log (since Twilio is unconfigured by default), then verify.
The admin row already has `role=admin`, so the very first access token
issued for `+380500000001` carries admin claims.
