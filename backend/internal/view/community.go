package view

import (
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type Community struct {
	ID            uuid.UUID  `json:"id"`
	Name          string     `json:"name"`
	TgChannelLink *string    `json:"tg_channel_link,omitempty"`
	OwnerID       uuid.UUID  `json:"owner_id"`
	CreatedAt     time.Time  `json:"created_at"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty"`
}

type CommunityPage struct {
	Items      []*Community `json:"items"`
	Pagination Pagination   `json:"pagination"`
}

func FromCommunity(c *model.Community) *Community {
	if c == nil {
		return nil
	}
	return &Community{
		ID:            c.ID,
		Name:          c.Name,
		TgChannelLink: c.TgChannelLink,
		OwnerID:       c.OwnerID,
		CreatedAt:     c.CreatedAt,
		DeletedAt:     c.DeletedAt,
	}
}
