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
}

type RegistrationCompanion struct {
	bun.BaseModel `bun:"table:vp.registration_companions"`

	ID             uuid.UUID  `bun:"id,pk,type:uuid"`
	RegistrationID uuid.UUID  `bun:"registration_id,type:uuid"`
	Phone          string     `bun:"phone"`
	VeteranID      *uuid.UUID `bun:"veteran_id,type:uuid"`
	Fullname       *string    `bun:"fullname"`
	Status         string     `bun:"status,type:vp.companion_status"`
	RespondedAt    *time.Time `bun:"responded_at"`
	CreatedAt      time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}
