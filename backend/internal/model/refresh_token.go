package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type RefreshToken struct {
	bun.BaseModel `bun:"table:vp.refresh_tokens"`

	ID         uuid.UUID  `bun:"id,pk,type:uuid"`
	VeteranID  uuid.UUID  `bun:"veteran_id,type:uuid"`
	TokenHash  string     `bun:"token_hash"`
	ExpiresAt  time.Time  `bun:"expires_at"`
	RevokedAt  *time.Time `bun:"revoked_at"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	LastUsedAt *time.Time `bun:"last_used_at"`
}

func NewRefreshToken(id, veteranID uuid.UUID, tokenHash string, expiresAt, now time.Time) *RefreshToken {
	return &RefreshToken{
		ID:        id,
		VeteranID: veteranID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}
}

func (t *RefreshToken) Active(now time.Time) bool {
	return t.RevokedAt == nil && now.Before(t.ExpiresAt)
}
