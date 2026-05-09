package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Event struct {
	bun.BaseModel `bun:"table:vp.events"`

	ID                  uuid.UUID  `bun:"id,pk,type:uuid"`
	Category            string     `bun:"category,type:vp.event_category"`
	Status              string     `bun:"status,type:vp.event_status"`
	Title               string     `bun:"title"`
	Description         *string    `bun:"description"`
	Quota               int        `bun:"quota"`
	SeatsTaken          int        `bun:"seats_taken"`
	StartsAt            time.Time  `bun:"starts_at"`
	EndsAt              *time.Time `bun:"ends_at"`
	Format              string     `bun:"format,type:vp.event_format"`
	Repeat              string     `bun:"repeat,type:vp.event_repeat"`
	ForWhom             string     `bun:"for_whom,type:vp.event_for_whom"`
	CostTier            string     `bun:"cost_tier,type:vp.event_cost_tier"`
	CostPriceUah        *float64   `bun:"cost_price_uah"`
	CostVeteranPriceUah *float64   `bun:"cost_veteran_price_uah"`
	AccessibilityTags   []string   `bun:"accessibility_tags,array"`
	VerifiedOnly        bool       `bun:"verified_only"`
	CommunityID         *uuid.UUID `bun:"community_id,type:uuid"`
	LocationCity        *string    `bun:"location_city"`
	LocationDistrict    *string    `bun:"location_district"`
	LocationAddress     *string    `bun:"location_address"`
	LocationVenue       *string    `bun:"location_venue"`
	LocationLat         *float64   `bun:"location_lat"`
	LocationLng         *float64   `bun:"location_lng"`
	CoverImageURL       *string    `bun:"cover_image_url"`
	CreatedByRole       string     `bun:"created_by_role,type:vp.event_created_by"`
	CreatedByID         uuid.UUID  `bun:"created_by_id,type:uuid"`
	RejectionReason     *string    `bun:"rejection_reason"`
	CreatedAt           time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt           time.Time  `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}
