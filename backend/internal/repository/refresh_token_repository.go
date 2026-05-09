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

type RefreshTokenRepository struct {
	db *bun.DB
}

func NewRefreshTokenRepository(db *bun.DB) *RefreshTokenRepository {
	return &RefreshTokenRepository{db: db}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, t *model.RefreshToken) error {
	_, err := r.db.NewInsert().Model(t).Exec(ctx)
	return err
}

func (r *RefreshTokenRepository) FindByHash(ctx context.Context, hash string) (*model.RefreshToken, error) {
	var t model.RefreshToken
	err := r.db.NewSelect().Model(&t).Where("token_hash = ?", hash).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *RefreshTokenRepository) Revoke(ctx context.Context, hash string, now time.Time) error {
	_, err := r.db.NewUpdate().
		Model((*model.RefreshToken)(nil)).
		Set("revoked_at = ?", now).
		Where("token_hash = ? AND revoked_at IS NULL", hash).
		Exec(ctx)
	return err
}

func (r *RefreshTokenRepository) RevokeAllForVeteran(ctx context.Context, veteranID uuid.UUID, now time.Time) error {
	_, err := r.db.NewUpdate().
		Model((*model.RefreshToken)(nil)).
		Set("revoked_at = ?", now).
		Where("veteran_id = ? AND revoked_at IS NULL", veteranID).
		Exec(ctx)
	return err
}

func (r *RefreshTokenRepository) TouchLastUsed(ctx context.Context, hash string, now time.Time) error {
	_, err := r.db.NewUpdate().
		Model((*model.RefreshToken)(nil)).
		Set("last_used_at = ?", now).
		Where("token_hash = ?", hash).
		Exec(ctx)
	return err
}
