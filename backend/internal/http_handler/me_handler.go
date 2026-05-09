package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type MeHandler struct {
	veteran *application.VeteranService
	auth    *server.AuthMiddleware
}

func NewMeHandler(veteran *application.VeteranService, auth *server.AuthMiddleware) *MeHandler {
	return &MeHandler{veteran: veteran, auth: auth}
}

func RegisterMeHandler(r *fhrouter.Router, h *MeHandler) {
	r.GET("/api/v1/me", h.auth.RequireVeteran(h.Get))
	r.PATCH("/api/v1/me", h.auth.RequireVeteran(h.Update))
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
