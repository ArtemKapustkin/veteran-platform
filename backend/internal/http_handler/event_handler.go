package http_handler

import (
	"time"

	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/google/uuid"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/repository"
	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type EventHandler struct {
	events *application.EventService
	auth   *server.AuthMiddleware
}

func NewEventHandler(events *application.EventService, auth *server.AuthMiddleware) *EventHandler {
	return &EventHandler{events: events, auth: auth}
}

func RegisterEventHandler(r *fhrouter.Router, h *EventHandler) {
	r.GET("/api/v1/events", h.List)
	r.GET("/api/v1/events/{id}", h.auth.Optional(h.Get))
	r.POST("/api/v1/events", h.auth.RequireVeteran(h.Create))
}

func (h *EventHandler) List(ctx *fasthttp.RequestCtx) {
	args := ctx.QueryArgs()
	f := repository.ListFilters{
		Categories:         multiString(args, "category"),
		ForWhom:            multiString(args, "for_whom"),
		Formats:            multiString(args, "format"),
		Repeat:             optString(args, "repeat"),
		CostTiers:          multiString(args, "cost"),
		City:               optString(args, "city"),
		Districts:          multiString(args, "district"),
		AccessibilityTags:  multiString(args, "accessibility_tags"),
		ParticipantsBucket: optString(args, "participants_bucket"),
		DateFrom:           optTime(args, "date_from"),
		DateTo:             optTime(args, "date_to"),
		VerifiedOnly:       optBool(args, "verified_only"),
		CommunityID:        optUUID(args, "community_id"),
		HasQuota:           optBool(args, "has_quota"),
		Q:                  optString(args, "q"),
		Limit:              optInt(args, "limit"),
	}
	if s := optString(args, "sort"); s != nil {
		f.Sort = *s
	}
	res, err := h.events.ListPublic(ctx, f)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *EventHandler) Get(ctx *fasthttp.RequestCtx) {
	id := pathUUID(ctx, "id")
	res, err := h.events.Get(ctx, id, server.OptionalVeteranID(ctx), server.IsAdmin(ctx))
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *EventHandler) Create(ctx *fasthttp.RequestCtx) {
	var req createEventReq
	server.DecodeJSON(ctx, &req)
	creator := server.VeteranID(ctx)
	res, err := h.events.Create(ctx, creator, req.toInput(), server.IsAdmin(ctx))
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusCreated, res)
}

type costReq struct {
	Tier            string   `json:"tier"`
	PriceUah        *float64 `json:"price_uah"`
	VeteranPriceUah *float64 `json:"veteran_price_uah"`
}

type locationReq struct {
	City     *string  `json:"city"`
	District *string  `json:"district"`
	Address  *string  `json:"address"`
	Venue    *string  `json:"venue"`
	Lat      *float64 `json:"lat"`
	Lng      *float64 `json:"lng"`
}

type createEventReq struct {
	Category          string       `json:"category"`
	Title             string       `json:"title"`
	Description       *string      `json:"description"`
	Quota             int          `json:"quota"`
	StartsAt          time.Time    `json:"starts_at"`
	EndsAt            *time.Time   `json:"ends_at"`
	Format            string       `json:"format"`
	Repeat            *string      `json:"repeat"`
	ForWhom           string       `json:"for_whom"`
	Cost              costReq      `json:"cost"`
	AccessibilityTags []string     `json:"accessibility_tags"`
	VerifiedOnly      bool         `json:"verified_only"`
	CommunityID       *uuid.UUID   `json:"community_id"`
	Location          *locationReq `json:"location"`
	CoverImageURL     *string      `json:"cover_image_url"`
	Status            *string      `json:"status"`
}

var (
	categoryValues = []any{"spa", "sport", "yoga", "culture", "education", "nature", "psychology", "social", "rehabilitation"}
	formatValues   = []any{"offline", "online", "hybrid"}
	repeatValues   = []any{"once", "weekly", "biweekly", "monthly"}
	forWhomValues  = []any{
		"veterans", "female_veterans", "male_veterans", "families", "children",
		"fallen_families", "active_military", "veterans_and_families", "open",
	}
	costTierValues = []any{
		"free_for_all", "free_for_veterans_and_families", "free_for_ubd",
		"free_via_state_program", "discount_for_veterans", "paid",
	}
	accessibilityValues = []any{
		"is_accessible", "no_shooting", "kids_allowed", "separate_zones",
		"shelter_nearby", "age_18_plus",
	}
	districtValues = []any{
		"holosiivskyi", "obolonskyi", "pecherskyi", "podilskyi", "sviatoshynskyi",
		"solomianskyi", "shevchenkivskyi", "darnytskyi", "desnianskyi", "dniprovskyi",
	}
)

func (c costReq) Validate() error {
	return validation.ValidateStruct(&c,
		validation.Field(&c.Tier, validation.Required, validation.In(costTierValues...)),
		validation.Field(&c.PriceUah,
			validation.When(c.Tier == "paid" || c.Tier == "discount_for_veterans",
				validation.Required, validation.Min(0.0)),
		),
		validation.Field(&c.VeteranPriceUah,
			validation.When(c.Tier == "discount_for_veterans",
				validation.Required, validation.Min(0.0)),
		),
	)
}

func (l locationReq) Validate() error {
	return validation.ValidateStruct(&l,
		validation.Field(&l.District, validation.NilOrNotEmpty, validation.In(districtValues...)),
	)
}

func (r *createEventReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Category, validation.Required, validation.In(categoryValues...)),
		validation.Field(&r.Title, validation.Required, validation.Length(3, 80)),
		validation.Field(&r.Description, validation.NilOrNotEmpty, validation.Length(0, 150)),
		validation.Field(&r.Quota, validation.Required, validation.Min(1)),
		validation.Field(&r.StartsAt, validation.Required),
		validation.Field(&r.Format, validation.Required, validation.In(formatValues...)),
		validation.Field(&r.Repeat, validation.NilOrNotEmpty, validation.In(repeatValues...)),
		validation.Field(&r.ForWhom, validation.Required, validation.In(forWhomValues...)),
		validation.Field(&r.Cost),
		validation.Field(&r.AccessibilityTags, validation.Each(validation.In(accessibilityValues...))),
		validation.Field(&r.Location),
	)
}

func (r *createEventReq) toInput() application.CreateEventInput {
	in := application.CreateEventInput{
		Category:          r.Category,
		Title:             r.Title,
		Description:       r.Description,
		Quota:             r.Quota,
		StartsAt:          r.StartsAt,
		EndsAt:            r.EndsAt,
		Format:            r.Format,
		Repeat:            r.Repeat,
		ForWhom:           r.ForWhom,
		AccessibilityTags: r.AccessibilityTags,
		VerifiedOnly:      r.VerifiedOnly,
		CommunityID:       r.CommunityID,
		CoverImageURL:     r.CoverImageURL,
		Status:            r.Status,
		Cost: application.CostInput{
			Tier:            r.Cost.Tier,
			PriceUah:        r.Cost.PriceUah,
			VeteranPriceUah: r.Cost.VeteranPriceUah,
		},
	}
	if r.Location != nil {
		in.Location = &application.LocationInput{
			City:     r.Location.City,
			District: r.Location.District,
			Address:  r.Location.Address,
			Venue:    r.Location.Venue,
			Lat:      r.Location.Lat,
			Lng:      r.Location.Lng,
		}
	}
	return in
}
