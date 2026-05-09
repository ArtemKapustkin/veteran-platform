package application

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/model"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/view"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/otp"
)

const (
	maxGroupSize        = 4
	groupReservationTTL = 24 * time.Hour
	expirerInterval     = time.Minute
)

type RegistrationService struct {
	db       *bun.DB
	events   *repository.EventRepository
	regs     *repository.RegistrationRepository
	veterans *repository.VeteranRepository
	sender   otp.Sender
	log      *logger.Logger
}

func NewRegistrationService(
	db *bun.DB,
	events *repository.EventRepository,
	regs *repository.RegistrationRepository,
	veterans *repository.VeteranRepository,
	sender otp.Sender,
	log *logger.Logger,
) *RegistrationService {
	return &RegistrationService{
		db: db, events: events, regs: regs, veterans: veterans, sender: sender, log: log,
	}
}

type CreateRegistrationInput struct {
	Seats           int
	CompanionPhones []string
}

func (s *RegistrationService) Create(ctx context.Context, eventID, creatorID uuid.UUID, in CreateRegistrationInput) (*view.Registration, error) {
	if in.Seats < 1 || in.Seats > maxGroupSize {
		return nil, apperrors.NewValidationError("seats must be between 1 and 4", nil)
	}
	if in.Seats == 1 && len(in.CompanionPhones) > 0 {
		return nil, apperrors.NewValidationError("companions provided for solo registration", nil)
	}
	if in.Seats > 1 && len(in.CompanionPhones) != in.Seats-1 {
		return nil, apperrors.NewValidationError("companion_phones length must equal seats-1", nil)
	}

	event, err := s.events.FindByID(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if event == nil || event.Status != "published" {
		return nil, apperrors.NewNotFoundError("event not found")
	}
	if !event.StartsAt.After(time.Now()) {
		return nil, apperrors.NewConflictError("event already started")
	}

	creator, err := s.veterans.FindByID(ctx, creatorID)
	if err != nil {
		return nil, err
	}
	if creator == nil {
		return nil, apperrors.NewUnauthorizedError("veteran not found")
	}
	if event.VerifiedOnly && !creator.Verified {
		return nil, apperrors.NewForbiddenError("event requires verified veteran status")
	}

	if creator.Phone != nil {
		for _, p := range in.CompanionPhones {
			if p == *creator.Phone {
				return nil, apperrors.NewValidationError("cannot invite yourself", nil)
			}
		}
	}
	seen := make(map[string]bool, len(in.CompanionPhones))
	for _, p := range in.CompanionPhones {
		if seen[p] {
			return nil, apperrors.NewValidationError("duplicate companion phone", nil)
		}
		seen[p] = true
	}

	if existing, err := s.regs.FindActiveByEventAndVeteran(ctx, eventID, creatorID); err != nil {
		return nil, err
	} else if existing != nil {
		return nil, apperrors.NewConflictError("you already have an active registration for this event")
	}

	now := time.Now()
	registration := &model.Registration{
		ID:        uuid.New(),
		EventID:   eventID,
		VeteranID: creatorID,
		Seats:     in.Seats,
		CreatedAt: now,
		UpdatedAt: now,
	}
	if in.Seats == 1 {
		registration.Status = "confirmed"
		registration.ConfirmedAt = &now
	} else {
		registration.Status = "pending_companions"
		expires := now.Add(groupReservationTTL)
		registration.ReservationExpiresAt = &expires
	}

	companions := make([]*model.RegistrationCompanion, 0, len(in.CompanionPhones))
	for _, phone := range in.CompanionPhones {
		companions = append(companions, &model.RegistrationCompanion{
			ID:             uuid.New(),
			RegistrationID: registration.ID,
			Phone:          phone,
			Status:         "pending",
			CreatedAt:      now,
		})
	}
	registration.Companions = companions

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		res, err := tx.NewUpdate().
			Model((*model.Event)(nil)).
			Set("seats_taken = seats_taken + ?", in.Seats).
			Set("updated_at = ?", now).
			Where("id = ? AND seats_taken + ? <= quota AND status = 'published'", eventID, in.Seats).
			Exec(ctx)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return apperrors.NewConflictError("event quota exhausted")
		}
		if _, err := tx.NewInsert().Model(registration).Exec(ctx); err != nil {
			return err
		}
		for _, c := range companions {
			if _, err := tx.NewInsert().Model(c).Exec(ctx); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	for _, phone := range in.CompanionPhones {
		if err := s.sender.SendInvitation(ctx, phone, event.Title); err != nil {
			s.log.Warn("invitation send failed", "phone", phone, "err", err.Error())
		}
	}

	return view.FromRegistration(registration), nil
}

func (s *RegistrationService) Cancel(ctx context.Context, eventID, registrationID, callerID uuid.UUID) error {
	now := time.Now()
	reg, err := s.regs.FindByID(ctx, registrationID)
	if err != nil {
		return err
	}
	if reg == nil || reg.EventID != eventID {
		return apperrors.NewNotFoundError("registration not found")
	}
	if reg.VeteranID != callerID {
		return apperrors.NewForbiddenError("not your registration")
	}
	if reg.Status == "cancelled" || reg.Status == "expired" {
		return nil
	}
	return s.releaseAndCancel(ctx, reg, "cancelled", now)
}

func (s *RegistrationService) releaseAndCancel(ctx context.Context, reg *model.Registration, finalStatus string, now time.Time) error {
	return s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		res, err := tx.NewUpdate().
			Model((*model.Registration)(nil)).
			Set("status = ?", finalStatus).
			Set("cancelled_at = ?", now).
			Set("updated_at = ?", now).
			Where("id = ? AND status IN ('pending_companions', 'confirmed')", reg.ID).
			Exec(ctx)
		if err != nil {
			return err
		}
		n, _ := res.RowsAffected()
		if n == 0 {
			return nil
		}
		_, err = tx.NewUpdate().
			Model((*model.Event)(nil)).
			Set("seats_taken = GREATEST(seats_taken - ?, 0)", reg.Seats).
			Set("updated_at = ?", now).
			Where("id = ?", reg.EventID).
			Exec(ctx)
		return err
	})
}

func (s *RegistrationService) ListMine(ctx context.Context, veteranID uuid.UUID, status *string, limit int) (*view.RegistrationPage, error) {
	rows, err := s.regs.ListMine(ctx, veteranID, status, limit)
	if err != nil {
		return nil, err
	}
	return mapRegistrationPage(rows), nil
}

func (s *RegistrationService) ListEventRoster(ctx context.Context, eventID, callerID uuid.UUID, isAdmin bool) (*view.RegistrationPage, error) {
	if !isAdmin {
		event, err := s.events.FindByID(ctx, eventID)
		if err != nil {
			return nil, err
		}
		if event == nil {
			return nil, apperrors.NewNotFoundError("event not found")
		}
		if event.CreatedByID != callerID {
			return nil, apperrors.NewForbiddenError("organizer or admin only")
		}
	}
	rows, err := s.regs.ListByEvent(ctx, eventID, 200)
	if err != nil {
		return nil, err
	}
	return mapRegistrationPage(rows), nil
}

func (s *RegistrationService) ListInvitations(ctx context.Context, caller *model.Veteran) ([]*view.Invitation, error) {
	if caller.Phone == nil {
		return []*view.Invitation{}, nil
	}
	companions, err := s.regs.ListPendingInvitationsForPhone(ctx, *caller.Phone)
	if err != nil {
		return nil, err
	}
	out := make([]*view.Invitation, 0, len(companions))
	for _, c := range companions {
		reg, err := s.regs.FindByID(ctx, c.RegistrationID)
		if err != nil {
			return nil, err
		}
		if reg == nil {
			continue
		}
		event, err := s.events.FindByID(ctx, reg.EventID)
		if err != nil {
			return nil, err
		}
		organizer, err := s.veterans.FindByID(ctx, reg.VeteranID)
		if err != nil {
			return nil, err
		}
		inv := &view.Invitation{
			ID:             c.ID,
			RegistrationID: c.RegistrationID,
			Event:          view.FromEvent(event),
			SeatsInGroup:   reg.Seats,
			Status:         c.Status,
		}
		if reg.ReservationExpiresAt != nil {
			inv.ReservationExpiresAt = *reg.ReservationExpiresAt
		}
		if organizer != nil {
			inv.InvitedByFullname = organizer.Fullname
			if organizer.Phone != nil {
				inv.InvitedByPhone = *organizer.Phone
			}
		}
		out = append(out, inv)
	}
	return out, nil
}

func (s *RegistrationService) ConfirmInvitation(ctx context.Context, invitationID uuid.UUID, caller *model.Veteran) (*view.Registration, error) {
	now := time.Now()
	companion, err := s.regs.FindCompanionByID(ctx, invitationID)
	if err != nil {
		return nil, err
	}
	if companion == nil {
		return nil, apperrors.NewNotFoundError("invitation not found")
	}
	if caller.Phone == nil || *caller.Phone != companion.Phone {
		return nil, apperrors.NewForbiddenError("invitation not for you")
	}
	if companion.Status != "pending" {
		return nil, apperrors.NewConflictError("invitation already responded to")
	}
	reg, err := s.regs.FindByID(ctx, companion.RegistrationID)
	if err != nil {
		return nil, err
	}
	if reg == nil {
		return nil, apperrors.NewNotFoundError("registration not found")
	}
	if reg.Status != "pending_companions" {
		return nil, apperrors.NewConflictError("registration is no longer pending companions")
	}
	if reg.ReservationExpiresAt == nil || !reg.ReservationExpiresAt.After(now) {
		return nil, apperrors.NewConflictError("invitation expired")
	}
	event, err := s.events.FindByID(ctx, reg.EventID)
	if err != nil {
		return nil, err
	}
	if event != nil && event.VerifiedOnly && !caller.Verified {
		return nil, apperrors.NewForbiddenError("event requires verified veteran status")
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "confirmed").
			Set("veteran_id = ?", caller.ID).
			Set("fullname = ?", caller.Fullname).
			Set("responded_at = ?", now).
			Where("id = ? AND status = 'pending'", invitationID).
			Exec(ctx); err != nil {
			return err
		}
		count, err := tx.NewSelect().
			Model((*model.RegistrationCompanion)(nil)).
			Where("registration_id = ? AND status = 'pending'", reg.ID).
			Count(ctx)
		if err != nil {
			return err
		}
		if count == 0 {
			if _, err := tx.NewUpdate().
				Model((*model.Registration)(nil)).
				Set("status = ?", "confirmed").
				Set("confirmed_at = ?", now).
				Set("reservation_expires_at = NULL").
				Set("updated_at = ?", now).
				Where("id = ?", reg.ID).
				Exec(ctx); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	full, err := s.regs.FindByIDWithCompanions(ctx, reg.ID)
	if err != nil {
		return nil, err
	}
	return view.FromRegistration(full), nil
}

func (s *RegistrationService) DeclineInvitation(ctx context.Context, invitationID uuid.UUID, caller *model.Veteran) (*view.Registration, error) {
	now := time.Now()
	companion, err := s.regs.FindCompanionByID(ctx, invitationID)
	if err != nil {
		return nil, err
	}
	if companion == nil {
		return nil, apperrors.NewNotFoundError("invitation not found")
	}
	if caller.Phone == nil || *caller.Phone != companion.Phone {
		return nil, apperrors.NewForbiddenError("invitation not for you")
	}
	if companion.Status != "pending" {
		return nil, apperrors.NewConflictError("invitation already responded to")
	}
	reg, err := s.regs.FindByID(ctx, companion.RegistrationID)
	if err != nil {
		return nil, err
	}
	if reg == nil {
		return nil, apperrors.NewNotFoundError("registration not found")
	}

	err = s.db.RunInTx(ctx, nil, func(ctx context.Context, tx bun.Tx) error {
		if _, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "declined").
			Set("veteran_id = ?", caller.ID).
			Set("fullname = ?", caller.Fullname).
			Set("responded_at = ?", now).
			Where("id = ?", invitationID).
			Exec(ctx); err != nil {
			return err
		}
		if _, err := tx.NewUpdate().
			Model((*model.RegistrationCompanion)(nil)).
			Set("status = ?", "declined").
			Set("responded_at = ?", now).
			Where("registration_id = ? AND status = 'pending'", reg.ID).
			Exec(ctx); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	if reg.Status == "pending_companions" || reg.Status == "confirmed" {
		if err := s.releaseAndCancel(ctx, reg, "cancelled", now); err != nil {
			return nil, err
		}
	}
	full, err := s.regs.FindByIDWithCompanions(ctx, reg.ID)
	if err != nil {
		return nil, err
	}
	return view.FromRegistration(full), nil
}

func (s *RegistrationService) ExpireStale(ctx context.Context) (int, error) {
	now := time.Now()
	var stale []model.Registration
	if err := s.db.NewSelect().
		Model(&stale).
		Where("status = 'pending_companions' AND reservation_expires_at < ?", now).
		Limit(100).
		Scan(ctx); err != nil {
		return 0, err
	}
	count := 0
	for i := range stale {
		if err := s.releaseAndCancel(ctx, &stale[i], "expired", now); err != nil {
			s.log.Error("expire registration failed", "id", stale[i].ID, "err", err.Error())
			continue
		}
		count++
	}
	return count, nil
}

func StartRegistrationExpirer(lc fx.Lifecycle, svc *RegistrationService, log *logger.Logger) {
	ctx, cancel := context.WithCancel(context.Background())
	ticker := time.NewTicker(expirerInterval)
	lc.Append(fx.Hook{
		OnStart: func(_ context.Context) error {
			log.Info("registration expirer started", "interval", expirerInterval.String())
			go func() {
				for {
					select {
					case <-ctx.Done():
						return
					case <-ticker.C:
						if n, err := svc.ExpireStale(ctx); err != nil {
							log.Error("expire stale registrations", "err", err.Error())
						} else if n > 0 {
							log.Info("expired stale registrations", "count", n)
						}
					}
				}
			}()
			return nil
		},
		OnStop: func(_ context.Context) error {
			cancel()
			ticker.Stop()
			return nil
		},
	})
}

func mapRegistrationPage(rows []model.Registration) *view.RegistrationPage {
	items := make([]*view.Registration, 0, len(rows))
	for i := range rows {
		items = append(items, view.FromRegistration(&rows[i]))
	}
	return &view.RegistrationPage{
		Items:      items,
		Pagination: view.Pagination{NextCursor: nil},
	}
}
