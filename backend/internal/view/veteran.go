package view

import (
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
)

type Veteran struct {
	ID                 uuid.UUID `json:"id"`
	Phone              *string   `json:"phone,omitempty"`
	Email              *string   `json:"email,omitempty"`
	Fullname           *string   `json:"fullname,omitempty"`
	Brigade            *string   `json:"brigade,omitempty"`
	Rank               *string   `json:"rank,omitempty"`
	AudienceStatus     *string   `json:"audience_status,omitempty"`
	City               *string   `json:"city,omitempty"`
	Interests          []string  `json:"interests"`
	Verified           bool      `json:"verified"`
	VerificationStatus string    `json:"verification_status"`
	Role               string    `json:"role"`
	AccountStatus      string    `json:"account_status"`
	CreatedAt          time.Time `json:"created_at"`
}

func FromVeteran(v *model.Veteran) *Veteran {
	if v == nil {
		return nil
	}
	interests := v.Interests
	if interests == nil {
		interests = []string{}
	}
	return &Veteran{
		ID:                 v.ID,
		Phone:              v.Phone,
		Email:              v.Email,
		Fullname:           v.Fullname,
		Brigade:            v.Brigade,
		Rank:               v.Rank,
		AudienceStatus:     v.AudienceStatus,
		City:               v.City,
		Interests:          interests,
		Verified:           v.Verified,
		VerificationStatus: v.VerificationStatus,
		Role:               v.Role,
		AccountStatus:      v.AccountStatus,
		CreatedAt:          v.CreatedAt,
	}
}

type AuthTokens struct {
	AccessToken  string   `json:"access_token"`
	RefreshToken string   `json:"refresh_token"`
	ExpiresIn    int64    `json:"expires_in"`
	Role         string   `json:"role"`
	Veteran      *Veteran `json:"veteran,omitempty"`
}
