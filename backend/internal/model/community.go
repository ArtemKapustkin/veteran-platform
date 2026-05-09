package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Community struct {
	bun.BaseModel `bun:"table:vp.communities"`

	ID            uuid.UUID  `bun:"id,pk,type:uuid"`
	Name          string     `bun:"name"`
	TgChannelLink *string    `bun:"tg_channel_link"`
	OwnerID       uuid.UUID  `bun:"owner_id,type:uuid"`
	CreatedAt     time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt     time.Time  `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
	DeletedAt     *time.Time `bun:"deleted_at"`
}
