package application

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
)

type EventService struct {
	events *repository.EventRepository
}

func NewEventService(events *repository.EventRepository) *EventService {
	return &EventService{events: events}
}

type CostInput struct {
	Tier            string
	PriceUah        *float64
	VeteranPriceUah *float64
}

type LocationInput struct {
	City     *string
	District *string
	Address  *string
	Venue    *string
	Lat      *float64
	Lng      *float64
}

type CreateEventInput struct {
	Category          string
	Title             string
	Description       *string
	Quota             int
	StartsAt          time.Time
	EndsAt            *time.Time
	Format            string
	Repeat            *string
	ForWhom           string
	Cost              CostInput
	AccessibilityTags []string
	VerifiedOnly      bool
	CommunityID       *uuid.UUID
	Location          *LocationInput
	CoverImageURL     *string
	Status            *string
}

func (s *EventService) Create(ctx context.Context, creatorID uuid.UUID, in CreateEventInput, asAdmin bool) (*view.EventDetail, error) {
	now := time.Now()
	if !in.StartsAt.After(now) {
		return nil, apperrors.NewValidationError("starts_at must be in the future", nil)
	}
	if in.EndsAt != nil && !in.EndsAt.After(in.StartsAt) {
		return nil, apperrors.NewValidationError("ends_at must be after starts_at", nil)
	}

	repeat := "once"
	if in.Repeat != nil && *in.Repeat != "" {
		repeat = *in.Repeat
	}

	tags := in.AccessibilityTags
	if tags == nil {
		tags = []string{}
	}

	e := &model.Event{
		ID:                  uuid.New(),
		Category:            in.Category,
		Title:               in.Title,
		Description:         in.Description,
		Quota:               in.Quota,
		StartsAt:            in.StartsAt,
		EndsAt:              in.EndsAt,
		Format:              in.Format,
		Repeat:              repeat,
		ForWhom:             in.ForWhom,
		CostTier:            in.Cost.Tier,
		CostPriceUah:        in.Cost.PriceUah,
		CostVeteranPriceUah: in.Cost.VeteranPriceUah,
		AccessibilityTags:   tags,
		VerifiedOnly:        in.VerifiedOnly,
		CommunityID:         in.CommunityID,
		CoverImageURL:       in.CoverImageURL,
		CreatedByID:         creatorID,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
	if in.Location != nil {
		e.LocationCity = in.Location.City
		e.LocationDistrict = in.Location.District
		e.LocationAddress = in.Location.Address
		e.LocationVenue = in.Location.Venue
		e.LocationLat = in.Location.Lat
		e.LocationLng = in.Location.Lng
	}

	if asAdmin {
		e.CreatedByRole = "admin"
		if in.Status != nil && *in.Status != "" {
			e.Status = *in.Status
		} else {
			e.Status = "published"
		}
	} else {
		e.CreatedByRole = "veteran"
		e.Status = "pending_approval"
	}

	if err := s.events.Create(ctx, e); err != nil {
		return nil, err
	}
	return view.FromEventDetail(e), nil
}

func (s *EventService) Approve(ctx context.Context, id uuid.UUID) (*view.EventDetail, error) {
	e, err := s.events.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if e.Status != "pending_approval" {
		return nil, apperrors.NewConflictError("event is not pending approval")
	}
	e.Status = "published"
	e.RejectionReason = nil
	e.UpdatedAt = time.Now()
	if err := s.events.Update(ctx, e); err != nil {
		return nil, err
	}
	return view.FromEventDetail(e), nil
}

func (s *EventService) Reject(ctx context.Context, id uuid.UUID, reason string) (*view.EventDetail, error) {
	e, err := s.events.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if e.Status != "pending_approval" {
		return nil, apperrors.NewConflictError("event is not pending approval")
	}
	e.Status = "rejected"
	if reason != "" {
		e.RejectionReason = &reason
	}
	e.UpdatedAt = time.Now()
	if err := s.events.Update(ctx, e); err != nil {
		return nil, err
	}
	return view.FromEventDetail(e), nil
}

func (s *EventService) Get(ctx context.Context, id uuid.UUID, isAdmin bool) (*view.EventDetail, error) {
	e, err := s.events.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if !isAdmin && e.Status != "published" {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	return view.FromEventDetail(e), nil
}

func (s *EventService) ListPublic(ctx context.Context, f repository.ListFilters) (*view.EventPage, error) {
	rows, err := s.events.ListPublic(ctx, f)
	if err != nil {
		return nil, err
	}
	return mapPage(rows), nil
}

func (s *EventService) ListAdmin(ctx context.Context, f repository.ListFilters) (*view.EventPage, error) {
	rows, err := s.events.ListAdmin(ctx, f)
	if err != nil {
		return nil, err
	}
	return mapPage(rows), nil
}

func mapPage(rows []model.Event) *view.EventPage {
	items := make([]*view.Event, 0, len(rows))
	for i := range rows {
		items = append(items, view.FromEvent(&rows[i]))
	}
	return &view.EventPage{
		Items:      items,
		Pagination: view.Pagination{NextCursor: nil},
	}
}
