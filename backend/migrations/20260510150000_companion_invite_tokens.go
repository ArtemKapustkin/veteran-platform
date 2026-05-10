package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

// Switch the companion-invitation channel from SMS-by-phone to a
// Telegram-shareable link tied to a one-time token. Phone becomes
// nullable so groups can be created without collecting numbers up
// front; `invite_token` is unique so the public claim endpoint can
// resolve a slot from the URL alone.
//
// Old rows (legacy SMS invitations from the seed) keep their phone
// column and just get a backfilled token so they can still be claimed
// after the migration runs.
func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
ALTER TABLE vp.registration_companions
    ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE vp.registration_companions
    ADD COLUMN invite_token text;

-- Backfill any pre-existing companion rows with a unique placeholder
-- so the unique index can be added below. We use gen_random_uuid()
-- (PostgreSQL core, no pgcrypto dependency) since legacy SMS-flow
-- rows don't need to be claimable via the new share-link endpoints
-- — they exist only in dev/seed data.
UPDATE vp.registration_companions
SET invite_token = replace(gen_random_uuid()::text, '-', '')
WHERE invite_token IS NULL;

CREATE UNIQUE INDEX registration_companions_invite_token_idx
    ON vp.registration_companions (invite_token);
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
DROP INDEX IF EXISTS vp.registration_companions_invite_token_idx;

ALTER TABLE vp.registration_companions
    DROP COLUMN IF EXISTS invite_token;

UPDATE vp.registration_companions SET phone = '' WHERE phone IS NULL;
ALTER TABLE vp.registration_companions
    ALTER COLUMN phone SET NOT NULL;
`)
		return err
	})
}
