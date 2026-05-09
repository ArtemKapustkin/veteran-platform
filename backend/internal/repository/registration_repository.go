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

func (r *RegistrationRepository) FindActiveByEventAndVeteran(ctx context.Context, eventID, veteranID uuid.UUID) (*model.Registration, error) {
	var reg model.Registration
	err := r.db.NewSelect().
		Model(&reg).
		Relation("Companions").
		Where("registration.event_id = ? AND registration.veteran_id = ? AND registration.status IN ('pending_companions', 'confirmed')", eventID, veteranID).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &reg, nil
}

func (r *RegistrationRepository) FindCompanionByID(ctx context.Context, id uuid.UUID) (*model.RegistrationCompanion, error) {
	var c model.RegistrationCompanion
	err := r.db.NewSelect().Model(&c).Where("id = ?", id).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *RegistrationRepository) ListMine(ctx context.Context, veteranID uuid.UUID, status *string, limit int) ([]model.Registration, error) {
	var rows []model.Registration
	q := r.db.NewSelect().
		Model(&rows).
		Relation("Companions").
		Where("registration.veteran_id = ?", veteranID).
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

func (r *RegistrationRepository) ListPendingInvitationsForPhone(ctx context.Context, phone string) ([]model.RegistrationCompanion, error) {
	var rows []model.RegistrationCompanion
	err := r.db.NewSelect().
		Model(&rows).
		Join("JOIN vp.registrations r ON r.id = registration_companion.registration_id").
		Where("registration_companion.phone = ? AND registration_companion.status = 'pending' AND r.status = 'pending_companions' AND r.reservation_expires_at > now()", phone).
		Order("registration_companion.created_at DESC").
		Scan(ctx)
	if err != nil {
		return nil, err
	}
	return rows, nil
}
