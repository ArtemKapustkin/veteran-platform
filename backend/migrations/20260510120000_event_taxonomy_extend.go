package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
ALTER TYPE vp.event_category ADD VALUE IF NOT EXISTS 'charity';
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		return nil
	})
}
