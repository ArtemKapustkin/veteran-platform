# Testing plan

End-to-end manual verification of the backend. Walks through every public
endpoint with copy-pasteable `curl` commands. The OTP flow falls back to
the **console sender** when Twilio creds are blank, so you can test the
auth path without spending a single SMS.

## 1. Prerequisites

- Docker Desktop running
- Go 1.25+ (the Dockerfile uses 1.25-alpine; locally the tested version is 1.26)
- `curl`, `python3` or `jq` for parsing JSON in shell
- Available host ports: **5433** (Postgres), **8088** (backend)

## 2. First-time setup

```bash
git clone https://github.com/ArtemKapustkin/veteran-platform.git
cd veteran-platform/backend

cp config/.env.dist config/.env
# config/.env is gitignored. Twilio + OpenAI fields can stay empty;
# the service falls back to the console sender (OTP printed to logs)
# and a stub vision verifier (always returns "match").

make reset      # docker compose down -v → up postgres → migrate → seed
make run        # starts the API on http://localhost:8088
```

Open a **second terminal** for the test commands below. Leave the first
running so you can see the OTP codes.

## 3. Helper functions

Paste these once at the top of your second terminal:

```bash
LOG_TAIL='tail -f /dev/null'  # placeholder; OTP appears in `make run` log

# Extracts the latest OTP code printed to the running service log for a phone.
# Run `make run` in terminal 1 and pipe to a file if you want to grep:
#   make run | tee /tmp/vp.log

login() {
  local phone=$1
  curl -sS -X POST http://localhost:8088/api/v1/auth/otp/request \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\"}" >/dev/null
  echo "Look at the 'make run' terminal for the OTP code." >&2
  read -p "Enter OTP code for $phone: " code
  curl -sS -X POST http://localhost:8088/api/v1/auth/otp/verify \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"code\":\"$code\"}"
}

ACCESS_TOKEN=""
REFRESH_TOKEN=""
```

Or, if you piped the service log to a file (`make run | tee /tmp/vp.log`),
you can fully automate:

```bash
login_auto() {
  local phone=$1
  curl -sS -X POST http://localhost:8088/api/v1/auth/otp/request \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\"}" >/dev/null
  sleep 1
  local code
  code=$(grep -F "\"phone\":\"$phone\"" /tmp/vp.log | grep '"msg":"OTP"' \
         | tail -1 | sed -E 's/.*"code":"([0-9]+)".*/\1/')
  curl -sS -X POST http://localhost:8088/api/v1/auth/otp/verify \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$phone\",\"code\":\"$code\"}"
}
```

## 4. Smoke

```bash
curl -sS http://localhost:8088/healthz
# {"status":"ok"}

curl -sS http://localhost:8088/api/v1/reference/document-types | python3 -m json.tool
curl -sS http://localhost:8088/api/v1/reference/event-categories | python3 -m json.tool
curl -sS http://localhost:8088/api/v1/reference/cities | python3 -m json.tool
curl -sS "http://localhost:8088/api/v1/reference/districts?city=Київ" | python3 -m json.tool
curl -sS http://localhost:8088/api/v1/reference/limits | python3 -m json.tool
```

Expected: JSON with 7 doc types, 9 categories, 7 cities, 10 Kyiv districts,
and a limits object.

## 5. Auth flow

The seed includes admin **+380500000001** already promoted to admin role.

```bash
# Sign in as the seeded admin
ADMIN_RESP=$(login_auto +380500000001)
ADMIN_TOKEN=$(echo "$ADMIN_RESP"  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
ADMIN_REFRESH=$(echo "$ADMIN_RESP"| python3 -c 'import sys,json;print(json.load(sys.stdin)["refresh_token"])')

# Verify role
echo "$ADMIN_TOKEN" | cut -d. -f2 | base64 -d 2>/dev/null
# Should show "role":"admin"

# /me
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8088/api/v1/me | python3 -m json.tool

# Refresh
curl -sS -X POST http://localhost:8088/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$ADMIN_REFRESH\"}" | python3 -m json.tool

# Sign out
curl -sS -X POST http://localhost:8088/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$ADMIN_REFRESH\"}" -i | head -2
```

**Expected:** `200 OK` for /me with the seeded admin profile.
After logout, refreshing again returns `401 invalid refresh token`.

### Sign in as a fresh phone

```bash
NEW_RESP=$(login_auto +380501234567)
echo "$NEW_RESP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("created:", d["veteran"]["id"], "verified:", d["veteran"]["verified"])'
```

**Expected:** A new veteran row created, `verified=false`, `verification_status=none`.

### Rate limit

```bash
curl -sS -i -X POST http://localhost:8088/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+380501234567"}'
# 429 Too Many Requests within the same minute
```

## 6. Profile (/me)

```bash
VET_RESP=$(login_auto +380500000004)   # Микола Коваль (unverified)
VET_TOKEN=$(echo "$VET_RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -sS -X PATCH -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"city":"Київ","interests":["sport","psychology"]}' \
  http://localhost:8088/api/v1/me | python3 -m json.tool

# Validation: bogus enum
curl -sS -i -X PATCH -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audience_status":"hacker"}' \
  http://localhost:8088/api/v1/me | tail -3
# 400 validation_error: must be a valid value
```

## 7. Events — public listing

```bash
# All published (10 expected from seed)
curl -sS "http://localhost:8088/api/v1/events" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("count:",len(d["items"]))'

# Filter: only sport
curl -sS "http://localhost:8088/api/v1/events?category=sport" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]),[e["title"] for e in d["items"]])'

# Filter: Kyiv district
curl -sS "http://localhost:8088/api/v1/events?district=holosiivskyi" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'

# Filter: accessibility tag intersection (PG &&)
curl -sS "http://localhost:8088/api/v1/events?accessibility_tags=shelter_nearby&accessibility_tags=is_accessible" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]),[e["title"] for e in d["items"]])'

# Filter: free events for the seeded city
curl -sS "http://localhost:8088/api/v1/events?cost=free_for_all&city=Київ" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'

# Search (ILIKE on title + description)
curl -sS "http://localhost:8088/api/v1/events?q=пробіжка" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'
```

## 8. Veteran proposes an event → admin moderates

```bash
PROPOSAL=$(curl -sS -X POST http://localhost:8088/api/v1/events \
  -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category":"sport","title":"Тестовий захід","quota":10,
    "starts_at":"2026-08-01T10:00:00Z","format":"offline","for_whom":"veterans",
    "cost":{"tier":"free_for_all"}
  }')
EVENT_ID=$(echo "$PROPOSAL" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "$PROPOSAL" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("status:",d["status"])'
# pending_approval

# Public list does NOT show it
curl -sS "http://localhost:8088/api/v1/events?q=Тестовий" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'
# 0

# Admin sees it
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8088/api/v1/admin/events?status=pending_approval" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'

# Approve
curl -sS -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8088/api/v1/admin/events/$EVENT_ID/approve \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("status:",d["status"])'
# published

# Now public sees it
curl -sS "http://localhost:8088/api/v1/events?q=Тестовий" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'
# 1

# Reject path: propose another, then reject with reason
PROP2=$(curl -sS -X POST http://localhost:8088/api/v1/events \
  -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"yoga","title":"Не підходить","quota":5,
       "starts_at":"2026-08-05T10:00:00Z","format":"offline",
       "for_whom":"veterans","cost":{"tier":"free_for_all"}}')
P2_ID=$(echo "$PROP2" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

curl -sS -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" -d '{"reason":"дублікат"}' \
  http://localhost:8088/api/v1/admin/events/$P2_ID/reject \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["status"],d.get("rejection_reason"))'
# rejected дублікат

# Authorization: veteran cannot hit admin endpoint
curl -sS -i -X POST -H "Authorization: Bearer $VET_TOKEN" \
  http://localhost:8088/api/v1/admin/events/$EVENT_ID/approve | head -2
# 403 Forbidden
```

## 9. Solo registration

```bash
# Pick any published event
PUB_EVENT=$(curl -sS http://localhost:8088/api/v1/events \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["items"][0]["id"])')

REG=$(curl -sS -X POST -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" -d '{"seats":1}' \
  http://localhost:8088/api/v1/events/$PUB_EVENT/registrations)
REG_ID=$(echo "$REG" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "$REG" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("status:",d["status"])'
# confirmed

# /me/registrations
curl -sS -H "Authorization: Bearer $VET_TOKEN" http://localhost:8088/api/v1/me/registrations \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'

# my_registration on event detail
curl -sS -H "Authorization: Bearer $VET_TOKEN" http://localhost:8088/api/v1/events/$PUB_EVENT \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("my_reg:",d.get("my_registration",{}).get("status"))'

# Cancel
curl -sS -X DELETE -H "Authorization: Bearer $VET_TOKEN" \
  http://localhost:8088/api/v1/events/$PUB_EVENT/registrations/$REG_ID -i | head -2
# 204 No Content
```

## 10. Group registration with companion confirmation

```bash
# Organizer (Іван), Companion (Олена)
ORG_RESP=$(login_auto +380500000002)
ORG_TOKEN=$(echo "$ORG_RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# Organizer creates 2-seat group; backend issues 1 invite token
GROUP=$(curl -sS -X POST -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seats\":2}" \
  http://localhost:8088/api/v1/events/$PUB_EVENT/registrations)
GROUP_ID=$(echo "$GROUP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
INV_TOKEN=$(echo "$GROUP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["companions"][0]["invite_token"])')
echo "$GROUP" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("status:",d["status"],"reservation_expires_at:",d["reservation_expires_at"][:19])'
# pending_companions, +2h. Share https://app/invitations/$INV_TOKEN via Telegram.

# Public preview (no auth needed) — what the landing page renders
curl -sS http://localhost:8088/api/v1/invitations/$INV_TOKEN \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("event:",d["event"]["title"],"by",d["invited_by_fullname"])'

# Olена signs in and claims the slot via the link
COMP_RESP=$(login_auto +380500000003)
COMP_TOKEN=$(echo "$COMP_RESP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

curl -sS -X POST -H "Authorization: Bearer $COMP_TOKEN" \
  http://localhost:8088/api/v1/invitations/$INV_TOKEN/claim \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("reg status:",d["status"])'
# confirmed (since 1 of 1 companion confirmed)

# Quota reservation: event seats_taken should reflect both seats
curl -sS http://localhost:8088/api/v1/events/$PUB_EVENT \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("seats_taken:",d["seats_taken"])'

# Decline path: cancel the existing reg, redo, then have companion decline
curl -sS -X DELETE -H "Authorization: Bearer $ORG_TOKEN" \
  http://localhost:8088/api/v1/events/$PUB_EVENT/registrations/$GROUP_ID >/dev/null

GROUP=$(curl -sS -X POST -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seats\":2}" \
  http://localhost:8088/api/v1/events/$PUB_EVENT/registrations)
INV_TOKEN=$(echo "$GROUP" | python3 -c 'import sys,json;print(json.load(sys.stdin)["companions"][0]["invite_token"])')
curl -sS -X POST -H "Authorization: Bearer $COMP_TOKEN" \
  http://localhost:8088/api/v1/invitations/$INV_TOKEN/decline \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("reg after decline:",d["status"])'
# cancelled
```

### TTL expiry (don't want to wait 2 h?)

```bash
# Create a group, then backdate the reservation in the DB
GROUP_ID=$(curl -sS -X POST -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"seats\":2}" \
  http://localhost:8088/api/v1/events/$PUB_EVENT/registrations \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

docker exec veteran-platform-postgres-1 psql -U veteran -d veteran_platform -c \
  "UPDATE vp.registrations SET reservation_expires_at = now() - interval '1 minute' WHERE id = '$GROUP_ID'"

# Wait 60s for the next expirer tick, then check
sleep 65
docker exec veteran-platform-postgres-1 psql -U veteran -d veteran_platform -c \
  "SELECT status FROM vp.registrations WHERE id = '$GROUP_ID'"
# expired
```

## 11. Verification

### With stub verifier (no `OPENAI_API_KEY`)

```bash
# Any image works; stub returns "match" with confidence 0.85
echo -e '\x89PNG\r\n\x1a\n' > /tmp/test.png    # invalid PNG, but stub doesn't care

curl -sS -X POST -H "Authorization: Bearer $VET_TOKEN" \
  -F "document_type=ubd_dia" \
  -F "files=@/tmp/test.png" \
  http://localhost:8088/api/v1/me/verification \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("status:",d["status"],"decision:",d["documents"][0]["ai_result"]["decision"])'
# approved, match

# Veteran is now verified
curl -sS -H "Authorization: Bearer $VET_TOKEN" http://localhost:8088/api/v1/me \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("verified:",d["verified"])'
# True
```

### With real OpenAI key

Set `OPENAI_API_KEY=sk-...` in `config/.env`, restart `make run`, then upload
a real photo of a Ukrainian veteran ID:

```bash
curl -sS -X POST -H "Authorization: Bearer $VET_TOKEN" \
  -F "document_type=ubd_dia" \
  -F "files=@/path/to/your/UBD-photo.jpg" \
  http://localhost:8088/api/v1/me/verification \
  | python3 -m json.tool
```

The image bytes are streamed inline (base64 data URL) to OpenAI Chat
Completions and discarded after — they are never written to disk on this
server.

### Admin manual override

```bash
VET_ID=$(curl -sS -H "Authorization: Bearer $VET_TOKEN" http://localhost:8088/api/v1/me \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

curl -sS -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approved":true,"note":"manual approval, doc verified offline"}' \
  http://localhost:8088/api/v1/admin/veterans/$VET_ID/verify \
  | python3 -m json.tool

curl -sS -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:8088/api/v1/admin/veterans/$VET_ID/block \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print("account_status:",d["account_status"])'
# blocked → all refresh tokens revoked
```

## 12. Communities

```bash
# List (4 from seed)
curl -sS http://localhost:8088/api/v1/communities \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]),[c["name"] for c in d["items"]])'

# Create one
COMM=$(curl -sS -X POST -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test community","tg_channel_link":"https://t.me/example"}' \
  http://localhost:8088/api/v1/communities)
COMM_ID=$(echo "$COMM" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')

# Owner update
curl -sS -X PATCH -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Renamed"}' \
  http://localhost:8088/api/v1/communities/$COMM_ID

# Different veteran tries → 403
curl -sS -i -X PATCH -H "Authorization: Bearer $ORG_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"hacked"}' \
  http://localhost:8088/api/v1/communities/$COMM_ID | head -2

# Bad URL → 400
curl -sS -i -X POST -H "Authorization: Bearer $VET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"X","tg_channel_link":"not-a-url"}' \
  http://localhost:8088/api/v1/communities | tail -3

# Soft delete
curl -sS -X DELETE -H "Authorization: Bearer $VET_TOKEN" \
  http://localhost:8088/api/v1/communities/$COMM_ID -i | head -2
# 204

# Public list no longer shows it; admin can with include_deleted=true
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8088/api/v1/admin/communities?include_deleted=true" \
  | python3 -c 'import sys,json;d=json.load(sys.stdin);print(len(d["items"]))'
```

## 13. Quick integration check (one-liner)

```bash
make test            # runs all unit tests (auth + otp packages)
```

## 14. What you should see

| What | When |
|---|---|
| `make reset` exits cleanly | DB volume nuked, schema applied, demo rows inserted |
| `make run` logs `http server starting` on `:8088` | service ready |
| `OTP` log lines appear with the code in plaintext | Twilio creds blank (expected in dev) |
| `INVITATION` log lines | when group registration sends companion invites |
| `expired stale registrations count=N` | 1-min ticker found backdated reservations |
| `aivision: stub (OPENAI_API_KEY not set)` | OpenAI key blank — using stub verifier |
| `aivision: openai model=gpt-4o`        | OpenAI key set — real vision calls |

## 15. Tear-down

```bash
make stop
# Or full nuke:
docker compose -f deployments/docker-compose.yaml down -v
```
