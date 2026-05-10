package view

import (
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type RegistrationCompanion struct {
	ID uuid.UUID `json:"id"`
	// InviteToken lets the organizer build a Telegram share URL on the
	// client (`<frontend>/invitations/{token}`) without us having to
	// know the public origin server-side. Always present on freshly
	// created group registrations; legacy rows backfilled by the
	// 20260510150000 migration also expose one.
	InviteToken *string    `json:"invite_token,omitempty"`
	Phone       *string    `json:"phone,omitempty"`
	VeteranID   *uuid.UUID `json:"veteran_id,omitempty"`
	Fullname    *string    `json:"fullname,omitempty"`
	Status      string     `json:"status"`
	RespondedAt *time.Time `json:"responded_at,omitempty"`
}

type Registration struct {
	ID        uuid.UUID `json:"id"`
	EventID   uuid.UUID `json:"event_id"`
	VeteranID uuid.UUID `json:"veteran_id"`
	// OrganizerFullname surfaces the group creator's display name to
	// recipients so the event-detail panel can render "Z Іваном П."
	// without a second `/me` call. Always populated when the
	// `Organizer` relation was preloaded; nil otherwise.
	OrganizerFullname    *string                 `json:"organizer_fullname,omitempty"`
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

// InvitationLookup is the payload for the public
// `GET /api/v1/invitations/{token}` endpoint. Returns just enough
// for the landing page to render an event preview + organizer name
// without leaking other companions or the inviter's phone.
type InvitationLookup struct {
	Token                string    `json:"token"`
	RegistrationID       uuid.UUID `json:"registration_id"`
	Event                *Event    `json:"event"`
	InvitedByFullname    *string   `json:"invited_by_fullname,omitempty"`
	SeatsInGroup         int       `json:"seats_in_group"`
	ReservationExpiresAt time.Time `json:"reservation_expires_at"`
	Status               string    `json:"status"`
	// AlreadyClaimedByMe is true when the caller is authenticated and
	// the slot has already been confirmed by them. UI uses it to skip
	// the claim button and route straight to the event.
	AlreadyClaimedByMe bool `json:"already_claimed_by_me,omitempty"`
}

func FromRegistration(r *model.Registration) *Registration {
	if r == nil {
		return nil
	}
	companions := make([]RegistrationCompanion, 0, len(r.Companions))
	for _, c := range r.Companions {
		companions = append(companions, RegistrationCompanion{
			ID:          c.ID,
			InviteToken: c.InviteToken,
			Phone:       c.Phone,
			VeteranID:   c.VeteranID,
			Fullname:    c.Fullname,
			Status:      c.Status,
			RespondedAt: c.RespondedAt,
		})
	}
	out := &Registration{
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
	if r.Organizer != nil {
		out.OrganizerFullname = r.Organizer.Fullname
	}
	return out
}

// FromRegistrationFor is the audience-aware twin of FromRegistration.
// Companion `invite_token`s are the credential for joining a group, so
// they must NEVER be returned to a non-organizer (e.g. another
// confirmed companion who pulls the same registration via
// `/me/registrations`). The organizer keeps the full payload so the
// event-detail page can show share buttons per slot.
func FromRegistrationFor(r *model.Registration, viewerID uuid.UUID) *Registration {
	out := FromRegistration(r)
	if out == nil {
		return out
	}
	if r.VeteranID == viewerID {
		return out
	}
	for i := range out.Companions {
		out.Companions[i].InviteToken = nil
	}
	return out
}
