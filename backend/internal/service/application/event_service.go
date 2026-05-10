package application

import (
	"context"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/uptrace/bun"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
)

// attendeesPerEvent caps how many avatar summaries we ship per event. The
// card UI renders ~5 avatars + a "+N" overflow; 8 gives a small buffer
// for the detail page.
const attendeesPerEvent = 8

type EventService struct {
	db     *bun.DB
	events *repository.EventRepository
	regs   *repository.RegistrationRepository
}

func NewEventService(db *bun.DB, events *repository.EventRepository, regs *repository.RegistrationRepository) *EventService {
	return &EventService{db: db, events: events, regs: regs}
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

func (s *EventService) Get(ctx context.Context, id uuid.UUID, viewerID *uuid.UUID, isAdmin bool) (*view.EventDetail, error) {
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
	detail := view.FromEventDetail(e)
	if err := s.attachAttendees(ctx, []*view.Event{detail.Event}); err != nil {
		return nil, err
	}
	if viewerID != nil {
		reg, err := s.regs.FindActiveByEventAndVeteran(ctx, id, *viewerID)
		if err != nil {
			return nil, err
		}
		if reg != nil {
			// Redact companion invite_tokens unless the viewer is the
			// organizer — confirmed companions also see their own
			// registration here via the EXISTS clause inside the repo.
			detail.MyRegistration = view.FromRegistrationFor(reg, *viewerID)
		}
	}
	return detail, nil
}

func (s *EventService) ListPublic(ctx context.Context, f repository.ListFilters) (*view.EventPage, error) {
	rows, err := s.events.ListPublic(ctx, f)
	if err != nil {
		return nil, err
	}
	page := mapPage(rows)
	if err := s.attachAttendees(ctx, page.Items); err != nil {
		return nil, err
	}
	return page, nil
}

func (s *EventService) ListAdmin(ctx context.Context, f repository.ListFilters) (*view.EventPage, error) {
	rows, err := s.events.ListAdmin(ctx, f)
	if err != nil {
		return nil, err
	}
	page := mapPage(rows)
	if err := s.attachAttendees(ctx, page.Items); err != nil {
		return nil, err
	}
	return page, nil
}

// attachAttendees fetches the public attendee summaries for every event
// in `items` in a single round-trip and attaches them to the corresponding
// view structs. Skipped silently when `items` is empty.
func (s *EventService) attachAttendees(ctx context.Context, items []*view.Event) error {
	if len(items) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, 0, len(items))
	byID := make(map[uuid.UUID]*view.Event, len(items))
	for _, e := range items {
		if e == nil {
			continue
		}
		ids = append(ids, e.ID)
		byID[e.ID] = e
		// Pre-allocate so empty events end up with `[]` not `null` in JSON.
		e.Attendees = []view.EventAttendee{}
	}
	rows, err := s.regs.ListAttendeeSummaries(ctx, ids, attendeesPerEvent)
	if err != nil {
		return err
	}
	for _, row := range rows {
		ev, ok := byID[row.EventID]
		if !ok {
			continue
		}
		ev.Attendees = append(ev.Attendees, view.EventAttendee{
			VeteranID:      row.VeteranID,
			Initial:        nameInitials(row.Fullname),
			FirstName:      firstName(row.Fullname),
			AudienceStatus: row.AudienceStatus,
		})
	}
	return nil
}

type UpdateEventInput struct {
	Category          *string
	Title             *string
	Description       *string
	Quota             *int
	StartsAt          *time.Time
	EndsAt            *time.Time
	Format            *string
	Repeat            *string
	ForWhom           *string
	Cost              *CostInput
	AccessibilityTags []string
	HasAccessibility  bool
	VerifiedOnly      *bool
	CommunityID       *uuid.UUID
	Location          *LocationInput
	CoverImageURL     *string
}

func (s *EventService) Update(ctx context.Context, id uuid.UUID, in UpdateEventInput) (*view.EventDetail, error) {
	e, err := s.events.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil || e.Status == "deleted" {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if in.Quota != nil && *in.Quota < e.SeatsTaken {
		return nil, apperrors.NewConflictError("quota cannot be lowered below current seats_taken")
	}
	if in.Category != nil {
		e.Category = *in.Category
	}
	if in.Title != nil {
		e.Title = *in.Title
	}
	if in.Description != nil {
		e.Description = in.Description
	}
	if in.Quota != nil {
		e.Quota = *in.Quota
	}
	if in.StartsAt != nil {
		e.StartsAt = *in.StartsAt
	}
	if in.EndsAt != nil {
		e.EndsAt = in.EndsAt
	}
	if in.Format != nil {
		e.Format = *in.Format
	}
	if in.Repeat != nil {
		e.Repeat = *in.Repeat
	}
	if in.ForWhom != nil {
		e.ForWhom = *in.ForWhom
	}
	if in.Cost != nil {
		e.CostTier = in.Cost.Tier
		e.CostPriceUah = in.Cost.PriceUah
		e.CostVeteranPriceUah = in.Cost.VeteranPriceUah
	}
	if in.HasAccessibility {
		if in.AccessibilityTags == nil {
			e.AccessibilityTags = []string{}
		} else {
			e.AccessibilityTags = in.AccessibilityTags
		}
	}
	if in.VerifiedOnly != nil {
		e.VerifiedOnly = *in.VerifiedOnly
	}
	if in.CommunityID != nil {
		e.CommunityID = in.CommunityID
	}
	if in.Location != nil {
		e.LocationCity = in.Location.City
		e.LocationDistrict = in.Location.District
		e.LocationAddress = in.Location.Address
		e.LocationVenue = in.Location.Venue
		e.LocationLat = in.Location.Lat
		e.LocationLng = in.Location.Lng
	}
	if in.CoverImageURL != nil {
		e.CoverImageURL = in.CoverImageURL
	}
	e.UpdatedAt = time.Now()
	if err := s.events.Update(ctx, e); err != nil {
		return nil, err
	}
	return view.FromEventDetail(e), nil
}

func (s *EventService) Publish(ctx context.Context, id uuid.UUID) (*view.EventDetail, error) {
	e, err := s.events.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if e.Status != "draft" {
		return nil, apperrors.NewConflictError("only draft events can be published")
	}
	e.Status = "published"
	e.UpdatedAt = time.Now()
	if err := s.events.Update(ctx, e); err != nil {
		return nil, err
	}
	return view.FromEventDetail(e), nil
}

func (s *EventService) Cancel(ctx context.Context, id uuid.UUID) (*view.EventDetail, error) {
	return s.terminate(ctx, id, "cancelled", "only published events can be cancelled", []string{"published"})
}

func (s *EventService) SoftDelete(ctx context.Context, id uuid.UUID) error {
	if _, err := s.terminate(ctx, id, "deleted", "event already deleted", []string{"draft", "pending_approval", "published", "rejected", "cancelled"}); err != nil {
		return err
	}
	return nil
}

func (s *EventService) terminate(ctx context.Context, id uuid.UUID, finalStatus, conflictMsg string, allowedFrom []string) (*view.EventDetail, error) {
	e, err := s.events.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if e == nil {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	allowed := false
	for _, s := range allowedFrom {
		if e.Status == s {
			allowed = true
			break
		}
	}
	if !allowed {
		return nil, apperrors.NewConflictError(conflictMsg)
	}
	now := time.Now()
	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewUpdate().
			Model((*model.Event)(nil)).
			Set("status = ?", finalStatus).
			Set("updated_at = ?", now).
			Where("id = ?", id).
			Exec(ctx); err != nil {
			return err
		}
		_, err := tx.NewUpdate().
			Model((*model.Registration)(nil)).
			Set("status = ?", "cancelled").
			Set("cancelled_at = ?", now).
			Set("updated_at = ?", now).
			Where("event_id = ? AND status IN ('pending_companions', 'confirmed')", id).
			Exec(ctx)
		return err
	})
	if err != nil {
		return nil, err
	}
	e.Status = finalStatus
	e.UpdatedAt = now
	return view.FromEventDetail(e), nil
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

// nameInitials returns up to two uppercase initials from the fullname —
// the first letter of the first whitespace-separated token plus the first
// letter of the next token, so "Іван Петренко" → "ІП". Falls back to "С"
// (for "Свій") so we never render an empty avatar.
func nameInitials(fullname *string) string {
	if fullname == nil {
		return "С"
	}
	trimmed := strings.TrimSpace(*fullname)
	if trimmed == "" {
		return "С"
	}
	var b strings.Builder
	atWordStart := true
	for _, r := range trimmed {
		if unicode.IsSpace(r) {
			atWordStart = true
			continue
		}
		if atWordStart {
			b.WriteRune(unicode.ToUpper(r))
			atWordStart = false
			if utf8.RuneCountInString(b.String()) >= 2 {
				break
			}
		}
	}
	if b.Len() == 0 {
		return "С"
	}
	return b.String()
}

// firstName returns the first whitespace-separated token of the full name
// — what we actually want to show next to the avatar ("Іван", not the
// full "Іван Петренко"). Empty if no fullname is set.
func firstName(fullname *string) string {
	if fullname == nil {
		return ""
	}
	trimmed := strings.TrimSpace(*fullname)
	if trimmed == "" {
		return ""
	}
	if i := strings.IndexFunc(trimmed, unicode.IsSpace); i > 0 {
		return trimmed[:i]
	}
	return trimmed
}
