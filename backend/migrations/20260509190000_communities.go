package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
CREATE TABLE vp.communities (
    id              uuid PRIMARY KEY,
    name            text NOT NULL,
    tg_channel_link text,
    owner_id        uuid NOT NULL REFERENCES vp.veterans (id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);

CREATE INDEX communities_owner_idx ON vp.communities (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX communities_name_idx ON vp.communities (lower(name)) WHERE deleted_at IS NULL;
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `DROP TABLE IF EXISTS vp.communities;`)
		return err
	})
}
