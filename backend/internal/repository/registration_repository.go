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
