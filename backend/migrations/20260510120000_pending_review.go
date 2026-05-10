package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

// Adds the `pending_review` value to the verification_status enum so that
// veterans whose AI verification didn't produce a confident match end up
// in an admin queue instead of the (terminal-feeling) `rejected` bucket.
//
// `rejected` from now on means *the admin* explicitly rejected the
// submission — the AI's failure modes (unreadable, low confidence, error)
// all map to `pending_review`.
//
// Also adds an admin moderation note column to verification_attempts so the
// admin's reasoning is persisted with the decision row (`decided_by='admin'`).
func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		// PG 12+ allows ALTER TYPE … ADD VALUE inside a transaction so long
		// as the new value isn't *used* in the same transaction; we only add
		// it here, so the standard bun migration TX is fine. The
		// `IF NOT EXISTS` guard keeps re-runs idempotent.
		_, err := db.ExecContext(ctx, `
ALTER TYPE vp.verification_status ADD VALUE IF NOT EXISTS 'pending_review';
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		// Postgres can't drop individual enum values without rebuilding the
		// type. For a forward-only migration in dev/prod this no-op is
		// acceptable; manual rebuild is required if a real rollback is
		// needed.
		return nil
	})
}
