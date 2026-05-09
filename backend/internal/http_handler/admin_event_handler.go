package http_handler

import (
	"bytes"
	"encoding/json"
	"time"

	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

func jsonHasKey(body []byte, key string) bool {
	dec := json.NewDecoder(bytes.NewReader(body))
	for {
		t, err := dec.Token()
		if err != nil {
			return false
		}
		if s, ok := t.(string); ok && s == key {
			return true
		}
	}
}

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
	r.PATCH("/api/v1/admin/events/{id}", h.auth.RequireAdmin(h.Update))
	r.DELETE("/api/v1/admin/events/{id}", h.auth.RequireAdmin(h.Delete))
	r.POST("/api/v1/admin/events/{id}/approve", h.auth.RequireAdmin(h.Approve))
	r.POST("/api/v1/admin/events/{id}/reject", h.auth.RequireAdmin(h.Reject))
	r.POST("/api/v1/admin/events/{id}/publish", h.auth.RequireAdmin(h.Publish))
	r.POST("/api/v1/admin/events/{id}/cancel", h.auth.RequireAdmin(h.Cancel))
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

type updateEventReq struct {
	Category          *string      `json:"category"`
	Title             *string      `json:"title"`
	Description       *string      `json:"description"`
	Quota             *int         `json:"quota"`
	StartsAt          *time.Time   `json:"starts_at"`
	EndsAt            *time.Time   `json:"ends_at"`
	Format            *string      `json:"format"`
	Repeat            *string      `json:"repeat"`
	ForWhom           *string      `json:"for_whom"`
	Cost              *costReq     `json:"cost"`
	AccessibilityTags []string     `json:"accessibility_tags"`
	HasAccessibility  bool         `json:"-"`
	VerifiedOnly      *bool        `json:"verified_only"`
	CommunityID       *uuid.UUID   `json:"community_id"`
	Location          *locationReq `json:"location"`
	CoverImageURL     *string      `json:"cover_image_url"`
}

func (r *updateEventReq) Validate() error {
	rules := []*validation.FieldRules{
		validation.Field(&r.Category, validation.NilOrNotEmpty, validation.In(categoryValues...)),
		validation.Field(&r.Title, validation.NilOrNotEmpty, validation.Length(3, 80)),
		validation.Field(&r.Description, validation.NilOrNotEmpty, validation.Length(0, 150)),
		validation.Field(&r.Quota, validation.NilOrNotEmpty, validation.Min(1)),
		validation.Field(&r.Format, validation.NilOrNotEmpty, validation.In(formatValues...)),
		validation.Field(&r.Repeat, validation.NilOrNotEmpty, validation.In(repeatValues...)),
		validation.Field(&r.ForWhom, validation.NilOrNotEmpty, validation.In(forWhomValues...)),
		validation.Field(&r.AccessibilityTags, validation.Each(validation.In(accessibilityValues...))),
	}
	if r.Cost != nil {
		rules = append(rules, validation.Field(&r.Cost))
	}
	if r.Location != nil {
		rules = append(rules, validation.Field(&r.Location))
	}
	return validation.ValidateStruct(r, rules...)
}

func (h *AdminEventHandler) Update(ctx *fasthttp.RequestCtx) {
	hasField := jsonHasKey(ctx.PostBody(), "accessibility_tags")
	var req updateEventReq
	server.DecodeJSON(ctx, &req)
	req.HasAccessibility = hasField

	id := pathUUID(ctx, "id")
	in := application.UpdateEventInput{
		Category:          req.Category,
		Title:             req.Title,
		Description:       req.Description,
		Quota:             req.Quota,
		StartsAt:          req.StartsAt,
		EndsAt:            req.EndsAt,
		Format:            req.Format,
		Repeat:            req.Repeat,
		ForWhom:           req.ForWhom,
		AccessibilityTags: req.AccessibilityTags,
		HasAccessibility:  req.HasAccessibility,
		VerifiedOnly:      req.VerifiedOnly,
		CommunityID:       req.CommunityID,
		CoverImageURL:     req.CoverImageURL,
	}
	if req.Cost != nil {
		in.Cost = &application.CostInput{
			Tier:            req.Cost.Tier,
			PriceUah:        req.Cost.PriceUah,
			VeteranPriceUah: req.Cost.VeteranPriceUah,
		}
	}
	if req.Location != nil {
		in.Location = &application.LocationInput{
			City:     req.Location.City,
			District: req.Location.District,
			Address:  req.Location.Address,
			Venue:    req.Location.Venue,
			Lat:      req.Location.Lat,
			Lng:      req.Location.Lng,
		}
	}
	res, err := h.events.Update(ctx, id, in)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *AdminEventHandler) Delete(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	if err := h.events.SoftDelete(ctx, id); err != nil {
		panic(err)
	}
	server.RespondNoContent(ctx)
}

func (h *AdminEventHandler) Publish(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	res, err := h.events.Publish(ctx, id)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *AdminEventHandler) Cancel(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	res, err := h.events.Cancel(ctx, id)
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
