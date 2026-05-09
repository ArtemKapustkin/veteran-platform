package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type AdminEventHandler struct {
	events *application.EventService
	auth   *server.AuthMiddleware
}

func NewAdminEventHandler(events *application.EventService, auth *server.AuthMiddleware) *AdminEventHandler {
	return &AdminEventHandler{events: events, auth: auth}
}

func RegisterAdminEventHandler(r *fhrouter.Router, h *AdminEventHandler) {
	r.GET("/api/v1/admin/events", h.auth.RequireAdmin(h.List))
	r.POST("/api/v1/admin/events", h.auth.RequireAdmin(h.Create))
	r.POST("/api/v1/admin/events/{id}/approve", h.auth.RequireAdmin(h.Approve))
	r.POST("/api/v1/admin/events/{id}/reject", h.auth.RequireAdmin(h.Reject))
}

func (h *AdminEventHandler) List(ctx *fasthttp.RequestCtx) {
	args := ctx.QueryArgs()
	f := repository.ListFilters{
		Categories:    multiString(args, "category"),
		Statuses:      multiString(args, "status"),
		CreatedByRole: optString(args, "created_by"),
		CommunityID:   optUUID(args, "community_id"),
		Q:             optString(args, "q"),
		Limit:         optInt(args, "limit"),
	}
	if s := optString(args, "sort"); s != nil {
		f.Sort = *s
	}
	res, err := h.events.ListAdmin(ctx, f)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *AdminEventHandler) Create(ctx *fasthttp.RequestCtx) {
	var req createEventReq
	server.DecodeJSON(ctx, &req)
	creator := server.VeteranID(ctx)
	res, err := h.events.Create(ctx, creator, req.toInput(), true)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusCreated, res)
}

func (h *AdminEventHandler) Approve(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	res, err := h.events.Approve(ctx, id)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

type rejectReq struct {
	Reason string `json:"reason"`
}

func (r *rejectReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Reason, validation.Length(0, 500)),
	)
}

func (h *AdminEventHandler) Reject(ctx *fasthttp.RequestCtx) {
	var req rejectReq
	server.DecodeJSON(ctx, &req)
	id := pathUUID(ctx, "id")
	res, err := h.events.Reject(ctx, id, req.Reason)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}
