package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type OtpCode struct {
	bun.BaseModel `bun:"table:vp.otp_codes"`

	ID         uuid.UUID  `bun:"id,pk,type:uuid"`
	Phone      string     `bun:"phone"`
	CodeHash   string     `bun:"code_hash"`
	ExpiresAt  time.Time  `bun:"expires_at"`
	ConsumedAt *time.Time `bun:"consumed_at"`
	Attempts   int        `bun:"attempts"`
	CreatedAt  time.Time  `bun:"created_at,nullzero,notnull,default:current_timestamp"`
}

func NewOtpCode(id uuid.UUID, phone, codeHash string, expiresAt, now time.Time) *OtpCode {
	return &OtpCode{
		ID:        id,
		Phone:     phone,
		CodeHash:  codeHash,
		ExpiresAt: expiresAt,
		CreatedAt: now,
	}
}

func (o *OtpCode) Active(now time.Time) bool {
	return o.ConsumedAt == nil && now.Before(o.ExpiresAt)
}
