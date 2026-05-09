package view

import (
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type EventCost struct {
	Tier            string   `json:"tier"`
	PriceUah        *float64 `json:"price_uah,omitempty"`
	VeteranPriceUah *float64 `json:"veteran_price_uah,omitempty"`
}

type Location struct {
	City     *string  `json:"city,omitempty"`
	District *string  `json:"district,omitempty"`
	Address  *string  `json:"address,omitempty"`
	Venue    *string  `json:"venue,omitempty"`
	Lat      *float64 `json:"lat,omitempty"`
	Lng      *float64 `json:"lng,omitempty"`
}

// EventAttendee is the public, privacy-respecting summary of someone who's
// going to an event — enough to render an avatar circle and a first-name
// line ("Іван"), without exposing phone, full last name, or brigade.
type EventAttendee struct {
	VeteranID      uuid.UUID `json:"veteran_id"`
	Initial        string    `json:"initial"`
	FirstName      string    `json:"first_name,omitempty"`
	AudienceStatus string    `json:"audience_status,omitempty"`
}

type Event struct {
	ID                uuid.UUID       `json:"id"`
	Category          string          `json:"category"`
	Status            string          `json:"status"`
	Title             string          `json:"title"`
	Description       string          `json:"description,omitempty"`
	Quota             int             `json:"quota"`
	SeatsTaken        int             `json:"seats_taken"`
	SeatsRemaining    int             `json:"seats_remaining"`
	StartsAt          time.Time       `json:"starts_at"`
	EndsAt            *time.Time      `json:"ends_at,omitempty"`
	Format            string          `json:"format"`
	Repeat            string          `json:"repeat,omitempty"`
	ForWhom           string          `json:"for_whom"`
	Cost              *EventCost      `json:"cost"`
	AccessibilityTags []string        `json:"accessibility_tags"`
	VerifiedOnly      bool            `json:"verified_only"`
	CommunityID       *uuid.UUID      `json:"community_id,omitempty"`
	Location          *Location       `json:"location,omitempty"`
	CoverImageURL     *string         `json:"cover_image_url,omitempty"`
	CreatedByRole     string          `json:"created_by_role"`
	CreatedByID       uuid.UUID       `json:"created_by_id"`
	RejectionReason   *string         `json:"rejection_reason,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	// First few attendees (truncated server-side; total count is
	// `seats_taken`). Sorted by registration time ascending so the avatars
	// stay stable as more people join.
	Attendees []EventAttendee `json:"attendees"`
}

type EventDetail struct {
	*Event
	MyRegistration any `json:"my_registration,omitempty"`
}

type Pagination struct {
	NextCursor *string `json:"next_cursor"`
	Total      *int    `json:"total,omitempty"`
}

type EventPage struct {
	Items      []*Event   `json:"items"`
	Pagination Pagination `json:"pagination"`
}

func FromEvent(e *model.Event) *Event {
	if e == nil {
		return nil
	}
	var loc *Location
	if e.LocationCity != nil || e.LocationDistrict != nil || e.LocationAddress != nil ||
		e.LocationVenue != nil || e.LocationLat != nil || e.LocationLng != nil {
		loc = &Location{
			City:     e.LocationCity,
			District: e.LocationDistrict,
			Address:  e.LocationAddress,
			Venue:    e.LocationVenue,
			Lat:      e.LocationLat,
			Lng:      e.LocationLng,
		}
	}
	desc := ""
	if e.Description != nil {
		desc = *e.Description
	}
	tags := e.AccessibilityTags
	if tags == nil {
		tags = []string{}
	}
	return &Event{
		ID:             e.ID,
		Category:       e.Category,
		Status:         e.Status,
		Title:          e.Title,
		Description:    desc,
		Quota:          e.Quota,
		SeatsTaken:     e.SeatsTaken,
		SeatsRemaining: e.Quota - e.SeatsTaken,
		StartsAt:       e.StartsAt,
		EndsAt:         e.EndsAt,
		Format:         e.Format,
		Repeat:         e.Repeat,
		ForWhom:        e.ForWhom,
		Cost: &EventCost{
			Tier:            e.CostTier,
			PriceUah:        e.CostPriceUah,
			VeteranPriceUah: e.CostVeteranPriceUah,
		},
		AccessibilityTags: tags,
		VerifiedOnly:      e.VerifiedOnly,
		CommunityID:       e.CommunityID,
		Location:          loc,
		CoverImageURL:     e.CoverImageURL,
		CreatedByRole:     e.CreatedByRole,
		CreatedByID:       e.CreatedByID,
		RejectionReason:   e.RejectionReason,
		CreatedAt:         e.CreatedAt,
		Attendees:         []EventAttendee{},
	}
}

func FromEventDetail(e *model.Event) *EventDetail {
	return &EventDetail{Event: FromEvent(e)}
}
