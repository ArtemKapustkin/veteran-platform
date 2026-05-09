package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type OtpRepository struct {
	db *bun.DB
}

func NewOtpRepository(db *bun.DB) *OtpRepository {
	return &OtpRepository{db: db}
}

func (r *OtpRepository) Create(ctx context.Context, o *model.OtpCode) error {
	_, err := r.db.NewInsert().Model(o).Exec(ctx)
	return err
}

func (r *OtpRepository) FindActiveByPhone(ctx context.Context, phone string) (*model.OtpCode, error) {
	var o model.OtpCode
	err := r.db.NewSelect().
		Model(&o).
		Where("phone = ? AND consumed_at IS NULL", phone).
		Order("created_at DESC").
		Limit(1).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (r *OtpRepository) MarkConsumed(ctx context.Context, id uuid.UUID, now time.Time) error {
	_, err := r.db.NewUpdate().
		Model((*model.OtpCode)(nil)).
		Set("consumed_at = ?", now).
		Where("id = ?", id).
		Exec(ctx)
	return err
}

func (r *OtpRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.NewUpdate().
		Model((*model.OtpCode)(nil)).
		Set("attempts = attempts + 1").
		Where("id = ?", id).
		Exec(ctx)
	return err
}

func (r *OtpRepository) CountRecent(ctx context.Context, phone string, since time.Time) (int, error) {
	count, err := r.db.NewSelect().
		Model((*model.OtpCode)(nil)).
		Where("phone = ? AND created_at >= ?", phone, since).
		Count(ctx)
	return count, err
}
