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
