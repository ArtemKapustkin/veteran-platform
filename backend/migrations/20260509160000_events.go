package migrations

import (
	"context"

	"github.com/uptrace/bun"
)

func init() {
	Migrations.MustRegister(func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
CREATE TYPE vp.event_category AS ENUM (
    'spa', 'sport', 'yoga', 'culture', 'education',
    'nature', 'psychology', 'social', 'rehabilitation'
);

CREATE TYPE vp.event_status AS ENUM (
    'draft', 'pending_approval', 'published', 'rejected', 'cancelled', 'deleted'
);

CREATE TYPE vp.event_format AS ENUM ('offline', 'online', 'hybrid');

CREATE TYPE vp.event_repeat AS ENUM ('once', 'weekly', 'biweekly', 'monthly');

CREATE TYPE vp.event_for_whom AS ENUM (
    'veterans', 'female_veterans', 'male_veterans', 'families', 'children',
    'fallen_families', 'active_military', 'veterans_and_families', 'open'
);

CREATE TYPE vp.event_cost_tier AS ENUM (
    'free_for_all', 'free_for_veterans_and_families', 'free_for_ubd',
    'free_via_state_program', 'discount_for_veterans', 'paid'
);

CREATE TYPE vp.event_created_by AS ENUM ('admin', 'veteran');

CREATE TABLE vp.events (
    id                     uuid PRIMARY KEY,
    category               vp.event_category NOT NULL,
    status                 vp.event_status NOT NULL DEFAULT 'pending_approval',
    title                  text NOT NULL,
    description            text,
    quota                  integer NOT NULL CHECK (quota >= 1),
    seats_taken            integer NOT NULL DEFAULT 0 CHECK (seats_taken >= 0),
    starts_at              timestamptz NOT NULL,
    ends_at                timestamptz,
    format                 vp.event_format NOT NULL DEFAULT 'offline',
    repeat                 vp.event_repeat NOT NULL DEFAULT 'once',
    for_whom               vp.event_for_whom NOT NULL DEFAULT 'veterans',
    cost_tier              vp.event_cost_tier NOT NULL DEFAULT 'free_for_all',
    cost_price_uah         numeric(10, 2),
    cost_veteran_price_uah numeric(10, 2),
    accessibility_tags     text[] NOT NULL DEFAULT '{}'::text[],
    verified_only          boolean NOT NULL DEFAULT false,
    community_id           uuid,
    location_city          text,
    location_district      text,
    location_address       text,
    location_venue         text,
    location_lat           double precision,
    location_lng           double precision,
    cover_image_url        text,
    created_by_role        vp.event_created_by NOT NULL,
    created_by_id          uuid NOT NULL REFERENCES vp.veterans (id),
    rejection_reason       text,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX events_status_idx ON vp.events (status);
CREATE INDEX events_starts_at_idx ON vp.events (starts_at);
CREATE INDEX events_category_status_idx ON vp.events (category, status);
CREATE INDEX events_community_idx ON vp.events (community_id) WHERE community_id IS NOT NULL;
CREATE INDEX events_created_by_idx ON vp.events (created_by_id);
`)
		return err
	}, func(ctx context.Context, db *bun.DB) error {
		_, err := db.ExecContext(ctx, `
DROP TABLE IF EXISTS vp.events;
DROP TYPE IF EXISTS vp.event_created_by;
DROP TYPE IF EXISTS vp.event_cost_tier;
DROP TYPE IF EXISTS vp.event_for_whom;
DROP TYPE IF EXISTS vp.event_repeat;
DROP TYPE IF EXISTS vp.event_format;
DROP TYPE IF EXISTS vp.event_status;
DROP TYPE IF EXISTS vp.event_category;
`)
		return err
	})
}
