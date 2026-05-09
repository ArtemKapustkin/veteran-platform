package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
CREATE SCHEMA IF NOT EXISTS vp;

CREATE TYPE vp.audience_status AS ENUM (
    'veteran', 'veteran_female', 'family', 'fallen_family', 'active_military', 'other'
);

CREATE TYPE vp.verification_status AS ENUM (
    'none', 'processing', 'approved', 'rejected'
);

CREATE TYPE vp.user_role AS ENUM ('veteran', 'admin');

CREATE TYPE vp.account_status AS ENUM ('active', 'blocked');

CREATE TABLE vp.veterans (
    id                  uuid PRIMARY KEY,
    phone               text UNIQUE,
    email               text UNIQUE,
    password_hash       text,
    fullname            text,
    brigade             text,
    rank                text,
    audience_status     vp.audience_status,
    city                text,
    interests           text[] NOT NULL DEFAULT '{}'::text[],
    verified            boolean NOT NULL DEFAULT false,
    verification_status vp.verification_status NOT NULL DEFAULT 'none',
    role                vp.user_role NOT NULL DEFAULT 'veteran',
    account_status      vp.account_status NOT NULL DEFAULT 'active',
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE vp.otp_codes (
    id          uuid PRIMARY KEY,
    phone       text NOT NULL,
    code_hash   text NOT NULL,
    expires_at  timestamptz NOT NULL,
    consumed_at timestamptz,
    attempts    integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_codes_phone_active_idx ON vp.otp_codes (phone) WHERE consumed_at IS NULL;

CREATE TABLE vp.refresh_tokens (
    id           uuid PRIMARY KEY,
    veteran_id   uuid NOT NULL REFERENCES vp.veterans (id) ON DELETE CASCADE,
    token_hash   text NOT NULL UNIQUE,
    expires_at   timestamptz NOT NULL,
    revoked_at   timestamptz,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz
);

CREATE INDEX refresh_tokens_veteran_idx ON vp.refresh_tokens (veteran_id);
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
DROP TABLE IF EXISTS vp.refresh_tokens;
DROP TABLE IF EXISTS vp.otp_codes;
DROP TABLE IF EXISTS vp.veterans;
DROP TYPE IF EXISTS vp.account_status;
DROP TYPE IF EXISTS vp.user_role;
DROP TYPE IF EXISTS vp.verification_status;
DROP TYPE IF EXISTS vp.audience_status;
DROP SCHEMA IF EXISTS vp;
`)
		return err
	})
}
