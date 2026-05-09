package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
CREATE TYPE vp.document_type AS ENUM (
    'ubd_dia', 'ubd_paper', 'reestr_extract', 'form_6',
    'military_book', 'family_fallen', 'self_declaration'
);

CREATE TYPE vp.ai_decision AS ENUM ('match', 'no_match', 'unreadable');

CREATE TABLE vp.verification_attempts (
    id              uuid PRIMARY KEY,
    veteran_id      uuid NOT NULL REFERENCES vp.veterans (id) ON DELETE CASCADE,
    document_type   vp.document_type NOT NULL,
    submitted_at    timestamptz NOT NULL DEFAULT now(),
    decision        vp.ai_decision,
    confidence      double precision,
    extracted_name  text,
    extracted_id    text,
    notes           text,
    decided_at      timestamptz,
    decided_by      text
);

CREATE INDEX verification_attempts_veteran_idx ON vp.verification_attempts (veteran_id, submitted_at DESC);
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
DROP TABLE IF EXISTS vp.verification_attempts;
DROP TYPE IF EXISTS vp.ai_decision;
DROP TYPE IF EXISTS vp.document_type;
`)
		return err
	})
}
