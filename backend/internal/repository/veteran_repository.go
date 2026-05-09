package repository

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type VeteranRepository struct {
	db *bun.DB
}

func NewVeteranRepository(db *bun.DB) *VeteranRepository {
	return &VeteranRepository{db: db}
}

func (r *VeteranRepository) FindByPhone(ctx context.Context, phone string) (*model.Veteran, error) {
	var v model.Veteran
	err := r.db.NewSelect().Model(&v).Where("phone = ?", phone).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VeteranRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Veteran, error) {
	var v model.Veteran
	err := r.db.NewSelect().Model(&v).Where("id = ?", id).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VeteranRepository) FindByEmail(ctx context.Context, email string) (*model.Veteran, error) {
	var v model.Veteran
	err := r.db.NewSelect().Model(&v).Where("email = ?", email).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (r *VeteranRepository) Create(ctx context.Context, v *model.Veteran) error {
	_, err := r.db.NewInsert().Model(v).Exec(ctx)
	return err
}

func (r *VeteranRepository) Update(ctx context.Context, v *model.Veteran) error {
	_, err := r.db.NewUpdate().Model(v).WherePK().Exec(ctx)
	return err
}

type VeteranListFilters struct {
	VerificationStatus *string
	Verified           *bool
	AudienceStatus     *string
	Q                  *string
	Limit              int
}

func (r *VeteranRepository) List(ctx context.Context, f VeteranListFilters) ([]model.Veteran, error) {
	var rows []model.Veteran
	q := r.db.NewSelect().Model(&rows).Order("created_at DESC")
	if f.VerificationStatus != nil {
		q = q.Where("verification_status = ?", *f.VerificationStatus)
	}
	if f.Verified != nil {
		q = q.Where("verified = ?", *f.Verified)
	}
	if f.AudienceStatus != nil {
		q = q.Where("audience_status = ?", *f.AudienceStatus)
	}
	if f.Q != nil && *f.Q != "" {
		needle := "%" + *f.Q + "%"
		q = q.Where("(coalesce(fullname,'') ILIKE ? OR coalesce(phone,'') ILIKE ? OR coalesce(brigade,'') ILIKE ?)", needle, needle, needle)
	}
	limit := f.Limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	q = q.Limit(limit)
	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return rows, nil
}
