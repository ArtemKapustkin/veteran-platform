package application

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
)

type CommunityService struct {
	communities *repository.CommunityRepository
}

func NewCommunityService(communities *repository.CommunityRepository) *CommunityService {
	return &CommunityService{communities: communities}
}

type CreateCommunityInput struct {
	Name            string
	TgChannelLink   *string
}

func (s *CommunityService) Create(ctx context.Context, ownerID uuid.UUID, in CreateCommunityInput) (*view.Community, error) {
	now := time.Now()
	c := &model.Community{
		ID:            uuid.New(),
		Name:          in.Name,
		TgChannelLink: in.TgChannelLink,
		OwnerID:       ownerID,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := s.communities.Create(ctx, c); err != nil {
		return nil, err
	}
	return view.FromCommunity(c), nil
}

type UpdateCommunityInput struct {
	Name          *string
	TgChannelLink *string
	ClearTgLink   bool
}

func (s *CommunityService) Update(ctx context.Context, id, callerID uuid.UUID, isAdmin bool, in UpdateCommunityInput) (*view.Community, error) {
	c, err := s.communities.FindByID(ctx, id, false)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, apperrors.NewNotFoundError("community not found")
	}
	if !isAdmin && c.OwnerID != callerID {
		return nil, apperrors.NewForbiddenError("not your community")
	}
	if in.Name != nil {
		c.Name = *in.Name
	}
	if in.ClearTgLink {
		c.TgChannelLink = nil
	} else if in.TgChannelLink != nil {
		c.TgChannelLink = in.TgChannelLink
	}
	c.UpdatedAt = time.Now()
	if err := s.communities.Update(ctx, c); err != nil {
		return nil, err
	}
	return view.FromCommunity(c), nil
}

func (s *CommunityService) Delete(ctx context.Context, id, callerID uuid.UUID, isAdmin bool) error {
	c, err := s.communities.FindByID(ctx, id, false)
	if err != nil {
		return err
	}
	if c == nil {
		return apperrors.NewNotFoundError("community not found")
	}
	if !isAdmin && c.OwnerID != callerID {
		return apperrors.NewForbiddenError("not your community")
	}
	return s.communities.SoftDelete(ctx, id, time.Now())
}

func (s *CommunityService) Get(ctx context.Context, id uuid.UUID, isAdmin bool) (*view.Community, error) {
	c, err := s.communities.FindByID(ctx, id, isAdmin)
	if err != nil {
		return nil, err
	}
	if c == nil {
		return nil, apperrors.NewNotFoundError("community not found")
	}
	return view.FromCommunity(c), nil
}

func (s *CommunityService) List(ctx context.Context, search *string, includeDeleted bool, limit int) (*view.CommunityPage, error) {
	rows, err := s.communities.List(ctx, search, includeDeleted, limit)
	if err != nil {
		return nil, err
	}
	items := make([]*view.Community, 0, len(rows))
	for i := range rows {
		items = append(items, view.FromCommunity(&rows[i]))
	}
	return &view.CommunityPage{
		Items:      items,
		Pagination: view.Pagination{NextCursor: nil},
	}, nil
}
