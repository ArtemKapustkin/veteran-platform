package view

import (
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type RegistrationCompanion struct {
	ID          uuid.UUID  `json:"id"`
	Phone       string     `json:"phone"`
	VeteranID   *uuid.UUID `json:"veteran_id,omitempty"`
	Fullname    *string    `json:"fullname,omitempty"`
	Status      string     `json:"status"`
	RespondedAt *time.Time `json:"responded_at,omitempty"`
}

type Registration struct {
	ID                   uuid.UUID               `json:"id"`
	EventID              uuid.UUID               `json:"event_id"`
	VeteranID            uuid.UUID               `json:"veteran_id"`
	Seats                int                     `json:"seats"`
	Status               string                  `json:"status"`
	Companions           []RegistrationCompanion `json:"companions"`
	ReservationExpiresAt *time.Time              `json:"reservation_expires_at,omitempty"`
	CreatedAt            time.Time               `json:"created_at"`
	ConfirmedAt          *time.Time              `json:"confirmed_at,omitempty"`
	CancelledAt          *time.Time              `json:"cancelled_at,omitempty"`
}

type RegistrationPage struct {
	Items      []*Registration `json:"items"`
	Pagination Pagination      `json:"pagination"`
}

type Invitation struct {
	ID                   uuid.UUID `json:"id"`
	RegistrationID       uuid.UUID `json:"registration_id"`
	Event                *Event    `json:"event"`
	InvitedByFullname    *string   `json:"invited_by_fullname,omitempty"`
	InvitedByPhone       string    `json:"invited_by_phone"`
	SeatsInGroup         int       `json:"seats_in_group"`
	ReservationExpiresAt time.Time `json:"reservation_expires_at"`
	Status               string    `json:"status"`
}

func FromRegistration(r *model.Registration) *Registration {
	if r == nil {
		return nil
	}
	companions := make([]RegistrationCompanion, 0, len(r.Companions))
	for _, c := range r.Companions {
		companions = append(companions, RegistrationCompanion{
			ID:          c.ID,
			Phone:       c.Phone,
			VeteranID:   c.VeteranID,
			Fullname:    c.Fullname,
			Status:      c.Status,
			RespondedAt: c.RespondedAt,
		})
	}
	return &Registration{
		ID:                   r.ID,
		EventID:              r.EventID,
		VeteranID:            r.VeteranID,
		Seats:                r.Seats,
		Status:               r.Status,
		Companions:           companions,
		ReservationExpiresAt: r.ReservationExpiresAt,
		CreatedAt:            r.CreatedAt,
		ConfirmedAt:          r.ConfirmedAt,
		CancelledAt:          r.CancelledAt,
	}
}
