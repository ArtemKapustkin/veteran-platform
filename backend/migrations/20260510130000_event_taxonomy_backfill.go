package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
UPDATE vp.events
SET category = 'charity'
WHERE id IN (
    'b6918316-db0a-5637-bed4-7c0013a0c9cd',
    '3ccb7cfe-dd31-5eb1-8bb3-9be982bf62c1'
) AND category = 'sport';

UPDATE vp.events
SET accessibility_tags = ARRAY(SELECT DISTINCT unnest(accessibility_tags || '{no_shooting_or_publishing}'::text[]))
WHERE id IN (
    '4b970448-763d-5e1d-97de-6b4da0290665',
    'f26fafeb-4e0f-5ed6-b739-47630b60a49b'
);
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		return nil
	})
}
