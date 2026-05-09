package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type AdminVeteranHandler struct {
	verification *application.VerificationService
	veteran      *application.VeteranService
	auth         *server.AuthMiddleware
}

func NewAdminVeteranHandler(verification *application.VerificationService, veteran *application.VeteranService, auth *server.AuthMiddleware) *AdminVeteranHandler {
	return &AdminVeteranHandler{verification: verification, veteran: veteran, auth: auth}
}

func RegisterAdminVeteranHandler(r *fhrouter.Router, h *AdminVeteranHandler) {
	r.GET("/api/v1/admin/veterans", h.auth.RequireAdmin(h.List))
	r.GET("/api/v1/admin/veterans/{id}", h.auth.RequireAdmin(h.Get))
	r.POST("/api/v1/admin/veterans/{id}/verify", h.auth.RequireAdmin(h.Verify))
	r.POST("/api/v1/admin/veterans/{id}/block", h.auth.RequireAdmin(h.Block))
}

func (h *AdminVeteranHandler) List(ctx *fasthttp.RequestCtx) {
	args := ctx.QueryArgs()
	f := repository.VeteranListFilters{
		VerificationStatus: optString(args, "verification_status"),
		Verified:           optBool(args, "verified"),
		AudienceStatus:     optString(args, "audience_status"),
		Q:                  optString(args, "q"),
		Limit:              optInt(args, "limit"),
	}
	res, err := h.veteran.List(ctx, f)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *AdminVeteranHandler) Get(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	v, err := h.veteran.Get(ctx, id)
	if err != nil {
		panic(err)
	}
	state, err := h.verification.GetState(ctx, id)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{
		"veteran":      v,
		"verification": state,
	})
}

type adminVerifyReq struct {
	Approved *bool  `json:"approved"`
	Note     string `json:"note"`
}

func (r *adminVerifyReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Approved, validation.Required),
		validation.Field(&r.Note, validation.Length(0, 500)),
	)
}

func (h *AdminVeteranHandler) Verify(ctx *fasthttp.RequestCtx) {
	var req adminVerifyReq
	server.DecodeJSON(ctx, &req)
	id := pathUUID(ctx, "id")
	res, err := h.verification.AdminVerify(ctx, id, *req.Approved, req.Note)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *AdminVeteranHandler) Block(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	if err := h.verification.AdminBlock(ctx, id); err != nil {
		panic(err)
	}
	v, err := h.veteran.Get(ctx, id)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, v)
}
