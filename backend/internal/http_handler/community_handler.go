package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type CommunityHandler struct {
	communities *application.CommunityService
	auth        *server.AuthMiddleware
}

func NewCommunityHandler(communities *application.CommunityService, auth *server.AuthMiddleware) *CommunityHandler {
	return &CommunityHandler{communities: communities, auth: auth}
}

func RegisterCommunityHandler(r *fhrouter.Router, h *CommunityHandler) {
	r.GET("/api/v1/communities", h.List)
	r.GET("/api/v1/communities/{id}", h.Get)
	r.POST("/api/v1/communities", h.auth.RequireVeteran(h.Create))
	r.PATCH("/api/v1/communities/{id}", h.auth.RequireVeteran(h.Update))
	r.DELETE("/api/v1/communities/{id}", h.auth.RequireVeteran(h.Delete))
	r.GET("/api/v1/admin/communities", h.auth.RequireAdmin(h.AdminList))
	r.DELETE("/api/v1/admin/communities/{id}", h.auth.RequireAdmin(h.AdminDelete))
}

func (h *CommunityHandler) List(ctx *fasthttp.RequestCtx) {
	args := ctx.QueryArgs()
	search := optString(args, "search")
	limit := optInt(args, "limit")
	res, err := h.communities.List(ctx, search, false, limit)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *CommunityHandler) AdminList(ctx *fasthttp.RequestCtx) {
	args := ctx.QueryArgs()
	search := optString(args, "q")
	includeDeleted := false
	if v := optBool(args, "include_deleted"); v != nil {
		includeDeleted = *v
	}
	limit := optInt(args, "limit")
	res, err := h.communities.List(ctx, search, includeDeleted, limit)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *CommunityHandler) Get(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	res, err := h.communities.Get(ctx, id, false)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

type createCommunityReq struct {
	Name          string  `json:"name"`
	TgChannelLink *string `json:"tg_channel_link"`
}

func (r *createCommunityReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Name, validation.Required, validation.Length(2, 120)),
		validation.Field(&r.TgChannelLink, validation.NilOrNotEmpty, is.URL),
	)
}

func (h *CommunityHandler) Create(ctx *fasthttp.RequestCtx) {
	var req createCommunityReq
	server.DecodeJSON(ctx, &req)
	owner := server.VeteranID(ctx)
	res, err := h.communities.Create(ctx, owner, application.CreateCommunityInput{
		Name:          req.Name,
		TgChannelLink: req.TgChannelLink,
	})
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusCreated, res)
}

type updateCommunityReq struct {
	Name          *string  `json:"name"`
	TgChannelLink *string  `json:"tg_channel_link"`
	ClearTgLink   bool     `json:"-"`
}

func (r *updateCommunityReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Name, validation.NilOrNotEmpty, validation.Length(2, 120)),
		validation.Field(&r.TgChannelLink, validation.NilOrNotEmpty, is.URL),
	)
}

func (h *CommunityHandler) Update(ctx *fasthttp.RequestCtx) {
	var req updateCommunityReq
	server.DecodeJSON(ctx, &req)
	id := pathUUID(ctx, "id")
	caller := server.VeteranID(ctx)
	res, err := h.communities.Update(ctx, id, caller, server.IsAdmin(ctx), application.UpdateCommunityInput{
		Name:          req.Name,
		TgChannelLink: req.TgChannelLink,
	})
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *CommunityHandler) Delete(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	caller := server.VeteranID(ctx)
	if err := h.communities.Delete(ctx, id, caller, server.IsAdmin(ctx)); err != nil {
		panic(err)
	}
	server.RespondNoContent(ctx)
}

func (h *CommunityHandler) AdminDelete(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	caller := server.VeteranID(ctx)
	if err := h.communities.Delete(ctx, id, caller, true); err != nil {
		panic(err)
	}
	server.RespondNoContent(ctx)
}
