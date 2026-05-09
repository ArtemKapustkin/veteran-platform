package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"github.com/uptrace/bun/dialect/pgdialect"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type ListFilters struct {
	Categories         []string
	ForWhom            []string
	Formats            []string
	Repeat             *string
	CostTiers          []string
	City               *string
	Districts          []string
	AccessibilityTags  []string
	ParticipantsBucket *string
	DateFrom           *time.Time
	DateTo             *time.Time
	VerifiedOnly       *bool
	CommunityID        *uuid.UUID
	HasQuota           *bool
	Q                  *string
	Sort               string
	Limit              int

	Statuses      []string
	CreatedByRole *string
}

type EventRepository struct {
	db *bun.DB
}

func NewEventRepository(db *bun.DB) *EventRepository {
	return &EventRepository{db: db}
}

func (r *EventRepository) Create(ctx context.Context, e *model.Event) error {
	_, err := r.db.NewInsert().Model(e).Exec(ctx)
	return err
}

func (r *EventRepository) Update(ctx context.Context, e *model.Event) error {
	_, err := r.db.NewUpdate().Model(e).WherePK().Exec(ctx)
	return err
}

func (r *EventRepository) FindByID(ctx context.Context, id uuid.UUID) (*model.Event, error) {
	var e model.Event
	err := r.db.NewSelect().Model(&e).Where("id = ?", id).Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &e, nil
}

func (r *EventRepository) ListPublic(ctx context.Context, f ListFilters) ([]model.Event, error) {
	var events []model.Event
	q := r.db.NewSelect().Model(&events).Where("status = ?", "published")
	q = applyFilters(q, f)
	q = applySort(q, f.Sort)
	q = q.Limit(normaliseLimit(f.Limit))
	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return events, nil
}

func (r *EventRepository) ListAdmin(ctx context.Context, f ListFilters) ([]model.Event, error) {
	var events []model.Event
	q := r.db.NewSelect().Model(&events)
	if len(f.Statuses) > 0 {
		q = q.Where("status IN (?)", bun.In(f.Statuses))
	} else {
		q = q.Where("status <> ?", "deleted")
	}
	if f.CreatedByRole != nil {
		q = q.Where("created_by_role = ?", *f.CreatedByRole)
	}
	q = applyFilters(q, f)
	q = applySort(q, f.Sort)
	q = q.Limit(normaliseLimit(f.Limit))
	if err := q.Scan(ctx); err != nil {
		return nil, err
	}
	return events, nil
}

func applyFilters(q *bun.SelectQuery, f ListFilters) *bun.SelectQuery {
	if len(f.Categories) > 0 {
		q = q.Where("category IN (?)", bun.In(f.Categories))
	}
	if len(f.ForWhom) > 0 {
		q = q.Where("for_whom IN (?)", bun.In(f.ForWhom))
	}
	if len(f.Formats) > 0 {
		q = q.Where("format IN (?)", bun.In(f.Formats))
	}
	if f.Repeat != nil {
		q = q.Where("repeat = ?", *f.Repeat)
	}
	if len(f.CostTiers) > 0 {
		q = q.Where("cost_tier IN (?)", bun.In(f.CostTiers))
	}
	if f.City != nil {
		q = q.Where("location_city = ?", *f.City)
	}
	if len(f.Districts) > 0 {
		q = q.Where("location_district IN (?)", bun.In(f.Districts))
	}
	if len(f.AccessibilityTags) > 0 {
		q = q.Where("accessibility_tags && ?", pgdialect.Array(f.AccessibilityTags))
	}
	if f.ParticipantsBucket != nil {
		switch *f.ParticipantsBucket {
		case "up_to_10":
			q = q.Where("quota <= 10")
		case "10_to_30":
			q = q.Where("quota > 10 AND quota <= 30")
		case "30_plus":
			q = q.Where("quota > 30")
		}
	}
	if f.DateFrom != nil {
		q = q.Where("starts_at >= ?", *f.DateFrom)
	}
	if f.DateTo != nil {
		q = q.Where("starts_at <= ?", *f.DateTo)
	}
	if f.VerifiedOnly != nil {
		q = q.Where("verified_only = ?", *f.VerifiedOnly)
	}
	if f.CommunityID != nil {
		q = q.Where("community_id = ?", *f.CommunityID)
	}
	if f.HasQuota != nil && *f.HasQuota {
		q = q.Where("seats_taken < quota")
	}
	if f.Q != nil && *f.Q != "" {
		needle := "%" + *f.Q + "%"
		q = q.Where("(title ILIKE ? OR description ILIKE ?)", needle, needle)
	}
	return q
}

func applySort(q *bun.SelectQuery, sort string) *bun.SelectQuery {
	switch sort {
	case "date_desc":
		return q.Order("starts_at DESC")
	case "quota_remaining":
		return q.OrderExpr("(quota - seats_taken) DESC")
	default:
		return q.Order("starts_at ASC")
	}
}

func normaliseLimit(limit int) int {
	if limit <= 0 || limit > 100 {
		return 20
	}
	return limit
}
