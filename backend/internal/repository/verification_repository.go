package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type VerificationRepository struct {
	db *bun.DB
}

func NewVerificationRepository(db *bun.DB) *VerificationRepository {
	return &VerificationRepository{db: db}
}

func (r *VerificationRepository) Create(ctx context.Context, a *model.VerificationAttempt) error {
	_, err := r.db.NewInsert().Model(a).Exec(ctx)
	return err
}

func (r *VerificationRepository) ListByVeteran(ctx context.Context, veteranID uuid.UUID) ([]model.VerificationAttempt, error) {
	var rows []model.VerificationAttempt
	err := r.db.NewSelect().
		Model(&rows).
		Where("veteran_id = ?", veteranID).
		Order("submitted_at DESC").
		Scan(ctx)
	return rows, err
}
