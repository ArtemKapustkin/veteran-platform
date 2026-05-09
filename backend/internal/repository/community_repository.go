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

type CommunityRepository struct {
	db *bun.DB
}

func NewCommunityRepository(db *bun.DB) *CommunityRepository {
	return &CommunityRepository{db: db}
}

func (r *CommunityRepository) Create(ctx context.Context, c *model.Community) error {
	_, err := r.db.NewInsert().Model(c).Exec(ctx)
	return err
}

func (r *CommunityRepository) Update(ctx context.Context, c *model.Community) error {
	_, err := r.db.NewUpdate().Model(c).WherePK().Exec(ctx)
	return err
}

func (r *CommunityRepository) FindByID(ctx context.Context, id uuid.UUID, includeDeleted bool) (*model.Community, error) {
	var c model.Community
	q := r.db.NewSelect().Model(&c).Where("id = ?", id)
	if !includeDeleted {
		q = q.Where("deleted_at IS NULL")
	}
	err := q.Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *CommunityRepository) SoftDelete(ctx context.Context, id uuid.UUID, now time.Time) error {
	_, err := r.db.NewUpdate().
		Model((*model.Community)(nil)).
		Set("deleted_at = ?", now).
		Set("updated_at = ?", now).
		Where("id = ? AND deleted_at IS NULL", id).
		Exec(ctx)
	return err
}

func (r *CommunityRepository) List(ctx context.Context, search *string, includeDeleted bool, limit int) ([]model.Community, error) {
	var rows []model.Community
	q := r.db.NewSelect().Model(&rows).Order("created_at DESC")
	if !includeDeleted {
		q = q.Where("deleted_at IS NULL")
	}
	if search != nil && *search != "" {
		q = q.Where("name ILIKE ?", "%"+*search+"%")
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
