package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type MeHandler struct {
	veteran  *application.VeteranService
	regs     *application.RegistrationService
	veterans *repository.VeteranRepository
	auth     *server.AuthMiddleware
}

func NewMeHandler(
	veteran *application.VeteranService,
	regs *application.RegistrationService,
	veterans *repository.VeteranRepository,
	auth *server.AuthMiddleware,
) *MeHandler {
	return &MeHandler{veteran: veteran, regs: regs, veterans: veterans, auth: auth}
}

func RegisterMeHandler(r *fhrouter.Router, h *MeHandler) {
	r.GET("/api/v1/me", h.auth.RequireVeteran(h.Get))
	r.PATCH("/api/v1/me", h.auth.RequireVeteran(h.Update))
	r.GET("/api/v1/me/registrations", h.auth.RequireVeteran(h.MyRegistrations))
	r.GET("/api/v1/me/invitations", h.auth.RequireVeteran(h.MyInvitations))
	r.POST("/api/v1/me/invitations/{invitation_id}/confirm", h.auth.RequireVeteran(h.ConfirmInvitation))
	r.POST("/api/v1/me/invitations/{invitation_id}/decline", h.auth.RequireVeteran(h.DeclineInvitation))
}

func (h *MeHandler) Get(ctx *fasthttp.RequestCtx) {
	id := server.VeteranID(ctx)
	res, err := h.veteran.Get(ctx, id)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

type updateMeReq struct {
	Fullname       *string  `json:"fullname"`
	Brigade        *string  `json:"brigade"`
	Rank           *string  `json:"rank"`
	AudienceStatus *string  `json:"audience_status"`
	City           *string  `json:"city"`
	Interests      []string `json:"interests"`
}

var audienceStatusValues = []any{
	"veteran", "veteran_female", "family", "fallen_family", "active_military", "other",
}

var eventCategoryValues = []any{
	"spa", "sport", "yoga", "culture", "education", "nature",
	"psychology", "social", "rehabilitation",
}

func (r *updateMeReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Fullname, validation.NilOrNotEmpty, validation.Length(2, 200)),
		validation.Field(&r.Brigade, validation.NilOrNotEmpty, validation.Length(1, 200)),
		validation.Field(&r.Rank, validation.NilOrNotEmpty, validation.Length(1, 100)),
		validation.Field(&r.AudienceStatus, validation.NilOrNotEmpty, validation.In(audienceStatusValues...)),
		validation.Field(&r.City, validation.NilOrNotEmpty, validation.Length(2, 100)),
		validation.Field(&r.Interests, validation.Each(validation.In(eventCategoryValues...))),
	)
}

func (h *MeHandler) Update(ctx *fasthttp.RequestCtx) {
	var req updateMeReq
	server.DecodeJSON(ctx, &req)
	id := server.VeteranID(ctx)
	res, err := h.veteran.Update(ctx, id, application.UpdateProfileInput{
		Fullname:       req.Fullname,
		Brigade:        req.Brigade,
		Rank:           req.Rank,
		AudienceStatus: req.AudienceStatus,
		City:           req.City,
		Interests:      req.Interests,
	})
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *MeHandler) MyRegistrations(ctx *fasthttp.RequestCtx) {
	id := server.VeteranID(ctx)
	args := ctx.QueryArgs()
	status := optString(args, "status")
	limit := optInt(args, "limit")
	res, err := h.regs.ListMine(ctx, id, status, limit)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *MeHandler) MyInvitations(ctx *fasthttp.RequestCtx) {
	id := server.VeteranID(ctx)
	veteran, err := h.veterans.FindByID(ctx, id)
	if err != nil {
		panic(err)
	}
	if veteran == nil {
		panic(apperrors.NewUnauthorizedError("veteran not found"))
	}
	items, err := h.regs.ListInvitations(ctx, veteran)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{"items": items})
}

func (h *MeHandler) ConfirmInvitation(ctx *fasthttp.RequestCtx) {
	invitationID := pathUUID(ctx, "invitation_id")
	id := server.VeteranID(ctx)
	veteran, err := h.veterans.FindByID(ctx, id)
	if err != nil {
		panic(err)
	}
	if veteran == nil {
		panic(apperrors.NewUnauthorizedError("veteran not found"))
	}
	res, err := h.regs.ConfirmInvitation(ctx, invitationID, veteran)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *MeHandler) DeclineInvitation(ctx *fasthttp.RequestCtx) {
	invitationID := pathUUID(ctx, "invitation_id")
	id := server.VeteranID(ctx)
	veteran, err := h.veterans.FindByID(ctx, id)
	if err != nil {
		panic(err)
	}
	if veteran == nil {
		panic(apperrors.NewUnauthorizedError("veteran not found"))
	}
	res, err := h.regs.DeclineInvitation(ctx, invitationID, veteran)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}
