package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Registration struct {
	bun.BaseModel `bun:"table:vp.registrations"`

	ID                   uuid.UUID  `bun:"id,pk,type:uuid"`
	EventID              uuid.UUID  `bun:"event_id,type:uuid"`
	VeteranID            uuid.UUID  `bun:"veteran_id,type:uuid"`
	Seats                int        `bun:"seats"`
	Status               string     `bun:"status,type:vp.registration_status"`
	ReservationExpiresAt *time.Time `bun:"reservation_expires_at"`
	CreatedAt            time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	ConfirmedAt          *time.Time `bun:"confirmed_at"`
	CancelledAt          *time.Time `bun:"cancelled_at"`
	UpdatedAt            time.Time  `bun:"updated_at,nullzero,notnull,default:current_timestamp"`

	Companions []*RegistrationCompanion `bun:"rel:has-many,join:id=registration_id"`
	// Organizer is the veteran who created the group registration.
	// Loaded via `.Relation("Organizer")` so the registration view can
	// expose the organizer's fullname to recipients without a second
	// round-trip per row.
	Organizer *Veteran `bun:"rel:belongs-to,join:veteran_id=id"`
}

type RegistrationCompanion struct {
	bun.BaseModel `bun:"table:vp.registration_companions"`

	ID             uuid.UUID  `bun:"id,pk,type:uuid"`
	RegistrationID uuid.UUID  `bun:"registration_id,type:uuid"`
	// Phone is kept for backward compatibility with legacy SMS-style
	// invitations; new rows leave it NULL since invitations now travel
	// over a Telegram-shareable link addressed by `invite_token`.
	Phone *string `bun:"phone"`
	// InviteToken is the URL-safe one-time identifier embedded in the
	// share link. Unique across vp.registration_companions and resolved
	// by the public /api/v1/invitations/{token} endpoints.
	InviteToken *string    `bun:"invite_token"`
	VeteranID   *uuid.UUID `bun:"veteran_id,type:uuid"`
	Fullname    *string    `bun:"fullname"`
	Status      string     `bun:"status,type:vp.companion_status"`
	RespondedAt *time.Time `bun:"responded_at"`
	CreatedAt   time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}
