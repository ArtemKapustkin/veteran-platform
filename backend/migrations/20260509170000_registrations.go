package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
CREATE TYPE vp.registration_status AS ENUM (
    'pending_companions', 'confirmed', 'cancelled', 'expired'
);

CREATE TYPE vp.companion_status AS ENUM ('pending', 'confirmed', 'declined');

CREATE TABLE vp.registrations (
    id                     uuid PRIMARY KEY,
    event_id               uuid NOT NULL REFERENCES vp.events (id) ON DELETE CASCADE,
    veteran_id             uuid NOT NULL REFERENCES vp.veterans (id),
    seats                  integer NOT NULL CHECK (seats >= 1 AND seats <= 4),
    status                 vp.registration_status NOT NULL,
    reservation_expires_at timestamptz,
    created_at             timestamptz NOT NULL DEFAULT now(),
    confirmed_at           timestamptz,
    cancelled_at           timestamptz,
    updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX registrations_event_idx ON vp.registrations (event_id);
CREATE INDEX registrations_veteran_idx ON vp.registrations (veteran_id);
CREATE INDEX registrations_pending_expire_idx ON vp.registrations (reservation_expires_at)
    WHERE status = 'pending_companions';

CREATE UNIQUE INDEX registrations_unique_active_idx ON vp.registrations (event_id, veteran_id)
    WHERE status IN ('pending_companions', 'confirmed');

CREATE TABLE vp.registration_companions (
    id              uuid PRIMARY KEY,
    registration_id uuid NOT NULL REFERENCES vp.registrations (id) ON DELETE CASCADE,
    phone           text NOT NULL,
    veteran_id      uuid REFERENCES vp.veterans (id),
    fullname        text,
    status          vp.companion_status NOT NULL DEFAULT 'pending',
    responded_at    timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX registration_companions_phone_idx ON vp.registration_companions (phone);
CREATE INDEX registration_companions_registration_idx ON vp.registration_companions (registration_id);
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
DROP TABLE IF EXISTS vp.registration_companions;
DROP TABLE IF EXISTS vp.registrations;
DROP TYPE IF EXISTS vp.companion_status;
DROP TYPE IF EXISTS vp.registration_status;
`)
		return err
	})
}
