package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type RegistrationRepository struct {
	db *bun.DB
}

func NewRegistrationRepository(db *bun.DB) *RegistrationRepository {
	return &RegistrationRepository{db: db}
}

func (r *RegistrationRepository) DB() *bun.DB {
	return r.db
}

func (r *RegistrationRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Registration, error) {
	var reg model.Registration
	err := r.db.NewSelect().Model(&reg).Where("id = ?", id).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &reg, nil
}

func (r *RegistrationRepository) FindByIDWithCompanions(ctx context.Context, id uuid.UUID) (*model.Registration, error) {
	var reg model.Registration
	err := r.db.NewSelect().Model(&reg).Relation("Companions").Where("registration.id = ?", id).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &reg, nil
}

// FindActiveByEventAndVeteran returns the active registration the
// veteran is involved in for the given event — either as the
// organizer (`registration.veteran_id`) or as a confirmed companion.
// Used both as a duplicate-registration guard during create/claim and
// as the source of truth for `/me/registrations` sync, so a recipient
// who claimed a slot via a Telegram-share link sees their RSVP state
// reflected on every screen after a page reload.
func (r *RegistrationRepository) FindActiveByEventAndVeteran(ctx context.Context, eventID, veteranID uuid.UUID) (*model.Registration, error) {
	var reg model.Registration
	err := r.db.NewSelect().
		Model(&reg).
		Relation("Companions").
		Where("registration.event_id = ?", eventID).
		Where("registration.status IN ('pending_companions', 'confirmed')").
		Where(
			"(registration.veteran_id = ? OR EXISTS (SELECT 1 FROM vp.registration_companions rc WHERE rc.registration_id = registration.id AND rc.veteran_id = ? AND rc.status = 'confirmed'))",
			veteranID, veteranID,
		).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &reg, nil
}

// FindCompanionByInviteToken resolves the public Telegram-share token
// to the companion row that owns it. Returns nil when the token is
// unknown so callers can return 404 to anonymous probes without
// leaking which tokens have ever existed.
func (r *RegistrationRepository) FindCompanionByInviteToken(ctx context.Context, token string) (*model.RegistrationCompanion, error) {
	var c model.RegistrationCompanion
	err := r.db.NewSelect().Model(&c).Where("invite_token = ?", token).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

// ListMine returns every registration the veteran participates in —
// either as the organizer or as a confirmed companion who claimed a
// slot via a share link. Surfacing the latter is what keeps the
// recipient's "Ти йдеш" state correct after a page reload (the
// frontend hydrates `rsvpIds` from this list).
func (r *RegistrationRepository) ListMine(ctx context.Context, veteranID uuid.UUID, status *string, limit int) ([]model.Registration, error) {
	var rows []model.Registration
	q := r.db.NewSelect().
		Model(&rows).
		Relation("Companions").
		Where(
			"(registration.veteran_id = ? OR EXISTS (SELECT 1 FROM vp.registration_companions rc WHERE rc.registration_id = registration.id AND rc.veteran_id = ? AND rc.status = 'confirmed'))",
			veteranID, veteranID,
		).
		Order("registration.created_at DESC")
	if status != nil {
		q = q.Where("registration.status = ?", *status)
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	q = q.Limit(limit)
	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return rows, nil
}

func (r *RegistrationRepository) ListByEvent(ctx context.Context, eventID uuid.UUID, limit int) ([]model.Registration, error) {
	var rows []model.Registration
	q := r.db.NewSelect().
		Model(&rows).
		Relation("Companions").
		Where("registration.event_id = ?", eventID).
		Order("registration.created_at ASC")
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	q = q.Limit(limit)
	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return rows, nil
}

type InvitationRow struct {
	model.RegistrationCompanion `bun:",extend"`
	RegistrationStatus          string    `bun:"registration_status"`
	ReservationExpiresAt        *string   `bun:"reservation_expires_at"`
	EventID                     uuid.UUID `bun:"event_id,type:uuid"`
	OrganizerVeteranID          uuid.UUID `bun:"organizer_id,type:uuid"`
	Seats                       int       `bun:"seats"`
}

// AttendeeSummary is a public-safe row used to render the "X ветеранів
// уже йдуть" avatars on event cards. Only the data we're willing to show
// to anyone with a link to the event is included.
type AttendeeSummary struct {
	EventID        uuid.UUID `bun:"event_id,type:uuid"`
	VeteranID      uuid.UUID `bun:"veteran_id,type:uuid"`
	Fullname       *string   `bun:"fullname"`
	AudienceStatus string    `bun:"audience_status"`
}

// ListAttendeeSummaries returns up to `perEvent` confirmed/pending
// attendees for each requested event in a single query. Uses a LATERAL
// join so the per-event LIMIT applies independently — avoids an O(events)
// round-trip pattern from the service layer.
func (r *RegistrationRepository) ListAttendeeSummaries(
	ctx context.Context,
	eventIDs []uuid.UUID,
	perEvent int,
) ([]AttendeeSummary, error) {
	if len(eventIDs) == 0 {
		return nil, nil
	}
	if perEvent <= 0 || perEvent > 24 {
		perEvent = 8
	}
	var rows []AttendeeSummary
	err := r.db.NewRaw(`
SELECT a.event_id, a.veteran_id, a.fullname, a.audience_status
FROM unnest(?::uuid[]) AS e(id)
CROSS JOIN LATERAL (
  SELECT r.event_id, v.id AS veteran_id, v.fullname, v.audience_status
  FROM vp.registrations r
  JOIN vp.veterans v ON v.id = r.veteran_id
  WHERE r.event_id = e.id
    AND r.status IN ('confirmed', 'pending_companions')
  ORDER BY r.created_at ASC
  LIMIT ?
) a`, idsToPgArray(eventIDs), perEvent).Scan(ctx, &rows)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// idsToPgArray formats UUIDs as a Postgres `uuid[]` literal that pg-driver
// can bind to an `unnest()` call. We do this explicitly because `bun.In`
// emits `IN (?, ?, ...)` which doesn't compose with `unnest()`.
func idsToPgArray(ids []uuid.UUID) string {
	if len(ids) == 0 {
		return "{}"
	}
	out := make([]byte, 0, len(ids)*40)
	out = append(out, '{')
	for i, id := range ids {
		if i > 0 {
			out = append(out, ',')
		}
		out = append(out, id.String()...)
	}
	out = append(out, '}')
	return string(out)
}

// FindActiveClaimedCompanion returns a companion row that the given
// veteran has already confirmed for the given event (any registration).
// Used by the public invitation lookup so the landing page can detect
// the "you already accepted this" case and skip the claim button.
func (r *RegistrationRepository) FindActiveClaimedCompanion(ctx context.Context, eventID, veteranID uuid.UUID) (*model.RegistrationCompanion, error) {
	var c model.RegistrationCompanion
	err := r.db.NewSelect().
		Model(&c).
		Join("JOIN vp.registrations r ON r.id = registration_companion.registration_id").
		Where("r.event_id = ? AND registration_companion.veteran_id = ? AND registration_companion.status = 'confirmed'", eventID, veteranID).
		Limit(1).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}
