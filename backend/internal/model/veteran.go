package model

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Veteran struct {
	bun.BaseModel `bun:"table:vp.veterans"`

	ID                 uuid.UUID `bun:"id,pk,type:uuid"`
	Phone              *string   `bun:"phone"`
	Email              *string   `bun:"email"`
	PasswordHash       *string   `bun:"password_hash"`
	Fullname           *string   `bun:"fullname"`
	Brigade            *string   `bun:"brigade"`
	Rank               *string   `bun:"rank"`
	AudienceStatus     *string   `bun:"audience_status,type:vp.audience_status"`
	City               *string   `bun:"city"`
	Interests          []string  `bun:"interests,array"`
	Verified           bool      `bun:"verified"`
	VerificationStatus string    `bun:"verification_status,type:vp.verification_status"`
	Role               string    `bun:"role,type:vp.user_role"`
	AccountStatus      string    `bun:"account_status,type:vp.account_status"`
	CreatedAt          time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt          time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}

func NewVeteranFromPhone(id uuid.UUID, phone string, now time.Time) *Veteran {
	p := phone
	return &Veteran{
		ID:                 id,
		Phone:              &p,
		Verified:           false,
		VerificationStatus: "none",
		Role:               "veteran",
		AccountStatus:      "active",
		Interests:          []string{},
		CreatedAt:          now,
		UpdatedAt:          now,
	}
}
