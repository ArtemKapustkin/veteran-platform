package application

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
)

type VeteranService struct {
	veterans *repository.VeteranRepository
}

func NewVeteranService(veterans *repository.VeteranRepository) *VeteranService {
	return &VeteranService{veterans: veterans}
}

func (s *VeteranService) Get(ctx context.Context, id uuid.UUID) (*view.Veteran, error) {
	v, err := s.veterans.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, apperrors.NewNotFoundError("veteran not found")
	}
	return view.FromVeteran(v), nil
}

type UpdateProfileInput struct {
	Fullname       *string
	Brigade        *string
	Rank           *string
	AudienceStatus *string
	City           *string
	Interests      []string
}

func (s *VeteranService) Update(ctx context.Context, id uuid.UUID, in UpdateProfileInput) (*view.Veteran, error) {
	v, err := s.veterans.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if v == nil {
		return nil, apperrors.NewNotFoundError("veteran not found")
	}
	if in.Fullname != nil {
		v.Fullname = in.Fullname
	}
	if in.Brigade != nil {
		v.Brigade = in.Brigade
	}
	if in.Rank != nil {
		v.Rank = in.Rank
	}
	if in.AudienceStatus != nil {
		v.AudienceStatus = in.AudienceStatus
	}
	if in.City != nil {
		v.City = in.City
	}
	if in.Interests != nil {
		v.Interests = in.Interests
	}
	v.UpdatedAt = time.Now()
	if err := s.veterans.Update(ctx, v); err != nil {
		return nil, err
	}
	return view.FromVeteran(v), nil
}
