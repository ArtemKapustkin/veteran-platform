package http_handler

import (
	"github.com/google/uuid"

	fhrouter "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

// Telegram-share invitation endpoints. The token in the URL is the
// sole credential — anyone holding the link can preview the event
// (`Lookup`) and any signed-in veteran can claim or decline the slot.
type InvitationHandler struct {
	regs     *application.RegistrationService
	veterans *repository.VeteranRepository
	auth     *server.AuthMiddleware
}

func NewInvitationHandler(
	regs *application.RegistrationService,
	veterans *repository.VeteranRepository,
	auth *server.AuthMiddleware,
) *InvitationHandler {
	return &InvitationHandler{regs: regs, veterans: veterans, auth: auth}
}

func RegisterInvitationHandler(r *fhrouter.Router, h *InvitationHandler) {
	// Public preview so the landing page can render before sign-in.
	// Reads bearer auth opportunistically to surface the
	// "you already accepted this" case.
	r.GET("/api/v1/invitations/{token}", h.auth.Optional(h.Lookup))
	r.POST("/api/v1/invitations/{token}/claim", h.auth.RequireVeteran(h.Claim))
	r.POST("/api/v1/invitations/{token}/decline", h.auth.RequireVeteran(h.Decline))
}

func (h *InvitationHandler) Lookup(ctx *fasthttp.RequestCtx) {
	token := ctx.UserValue("token").(string)
	if token == "" {
		panic(apperrors.NewNotFoundError("invitation not found"))
	}
	var viewerID uuid.UUID
	if id := server.OptionalVeteranID(ctx); id != nil {
		viewerID = *id
	}
	res, err := h.regs.LookupInvitation(ctx, token, viewerID)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *InvitationHandler) Claim(ctx *fasthttp.RequestCtx) {
	token := ctx.UserValue("token").(string)
	if token == "" {
		panic(apperrors.NewNotFoundError("invitation not found"))
	}
	id := server.VeteranID(ctx)
	veteran, err := h.veterans.FindByID(ctx, id)
	if err != nil {
		panic(err)
	}
	if veteran == nil {
		panic(apperrors.NewUnauthorizedError("veteran not found"))
	}
	res, err := h.regs.ClaimInvitation(ctx, token, veteran)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *InvitationHandler) Decline(ctx *fasthttp.RequestCtx) {
	token := ctx.UserValue("token").(string)
	if token == "" {
		panic(apperrors.NewNotFoundError("invitation not found"))
	}
	id := server.VeteranID(ctx)
	veteran, err := h.veterans.FindByID(ctx, id)
	if err != nil {
		panic(err)
	}
	if veteran == nil {
		panic(apperrors.NewUnauthorizedError("veteran not found"))
	}
	res, err := h.regs.DeclineInvitation(ctx, token, veteran)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}
