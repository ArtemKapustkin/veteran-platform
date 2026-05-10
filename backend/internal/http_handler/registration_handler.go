package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type RegistrationHandler struct {
	regs *application.RegistrationService
	auth *server.AuthMiddleware
}

func NewRegistrationHandler(regs *application.RegistrationService, auth *server.AuthMiddleware) *RegistrationHandler {
	return &RegistrationHandler{regs: regs, auth: auth}
}

func RegisterRegistrationHandler(r *fhrouter.Router, h *RegistrationHandler) {
	r.POST("/api/v1/events/{id}/registrations", h.auth.RequireVeteran(h.Create))
	r.DELETE("/api/v1/events/{id}/registrations/{registration_id}", h.auth.RequireVeteran(h.Cancel))
	r.GET("/api/v1/events/{id}/registrations", h.auth.RequireVeteran(h.Roster))
	r.GET("/api/v1/admin/events/{id}/registrations", h.auth.RequireAdmin(h.AdminRoster))
}

type createRegistrationReq struct {
	Seats int `json:"seats"`
}

func (r *createRegistrationReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Seats, validation.Required, validation.Min(1), validation.Max(4)),
	)
}

func (h *RegistrationHandler) Create(ctx *fasthttp.RequestCtx) {
	var req createRegistrationReq
	server.DecodeJSON(ctx, &req)
	eventID := pathUUID(ctx, "id")
	creator := server.VeteranID(ctx)
	res, err := h.regs.Create(ctx, eventID, creator, application.CreateRegistrationInput{
		Seats: req.Seats,
	})
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusCreated, res)
}

func (h *RegistrationHandler) Cancel(ctx *fasthttp.RequestCtx) {
	eventID := pathUUID(ctx, "id")
	regID := pathUUID(ctx, "registration_id")
	caller := server.VeteranID(ctx)
	if err := h.regs.Cancel(ctx, eventID, regID, caller); err != nil {
		panic(err)
	}
	server.RespondNoContent(ctx)
}

func (h *RegistrationHandler) Roster(ctx *fasthttp.RequestCtx) {
	eventID := pathUUID(ctx, "id")
	caller := server.VeteranID(ctx)
	res, err := h.regs.ListEventRoster(ctx, eventID, caller, server.IsAdmin(ctx))
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *RegistrationHandler) AdminRoster(ctx *fasthttp.RequestCtx) {
	eventID := pathUUID(ctx, "id")
	caller := server.VeteranID(ctx)
	res, err := h.regs.ListEventRoster(ctx, eventID, caller, true)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}
