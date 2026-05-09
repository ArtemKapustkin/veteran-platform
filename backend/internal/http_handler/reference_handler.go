package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type ReferenceHandler struct{}

func NewReferenceHandler() *ReferenceHandler {
	return &ReferenceHandler{}
}

func RegisterReferenceHandler(r *fhrouter.Router, h *ReferenceHandler) {
	r.GET("/api/v1/reference/document-types", h.DocumentTypes)
	r.GET("/api/v1/reference/event-categories", h.EventCategories)
	r.GET("/api/v1/reference/cities", h.Cities)
	r.GET("/api/v1/reference/districts", h.Districts)
	r.GET("/api/v1/reference/limits", h.Limits)
}

type docTypeRef struct {
	Code     string `json:"code"`
	Label    string `json:"label"`
	Priority int    `json:"priority"`
}

var documentTypes = []docTypeRef{
	{Code: "ubd_dia", Label: "Е-посвідчення ветерана в Дії", Priority: 1},
	{Code: "ubd_paper", Label: "Посвідчення УБД (паперове або фото)", Priority: 2},
	{Code: "reestr_extract", Label: "Витяг з ЄДРВВ", Priority: 3},
	{Code: "form_6", Label: "Довідка про участь у бойових діях (форма 6)", Priority: 4},
	{Code: "military_book", Label: "Військовий квиток з відміткою УБД", Priority: 5},
	{Code: "family_fallen", Label: "Посвідчення члена сім'ї загиблого захисника", Priority: 6},
	{Code: "self_declaration", Label: "Документ в процесі оформлення", Priority: 7},
}

type eventCategoryRef struct {
	Code         string `json:"code"`
	Label        string `json:"label"`
	Icon         string `json:"icon"`
	DisplayOrder int    `json:"display_order"`
}

var eventCategories = []eventCategoryRef{
	{Code: "spa", Label: "СПА і відновлення", Icon: "ti-sparkles", DisplayOrder: 1},
	{Code: "psychology", Label: "Психологічна підтримка", Icon: "ti-brain", DisplayOrder: 2},
	{Code: "social", Label: "Зустрічі і спілкування", Icon: "ti-users", DisplayOrder: 3},
	{Code: "education", Label: "Навчання", Icon: "ti-book", DisplayOrder: 4},
	{Code: "sport", Label: "Спорт", Icon: "ti-run", DisplayOrder: 5},
	{Code: "culture", Label: "Культура", Icon: "ti-masks-theater", DisplayOrder: 6},
	{Code: "rehabilitation", Label: "Реабілітація", Icon: "ti-accessible", DisplayOrder: 7},
	{Code: "yoga", Label: "Йога і медитація", Icon: "ti-heart", DisplayOrder: 8},
	{Code: "nature", Label: "Природа і тури", Icon: "ti-tree", DisplayOrder: 9},
}

var cities = []string{
	"Київ", "Вінниця", "Харків", "Львів", "Дніпро", "Одеса", "Запоріжжя",
}

type districtRef struct {
	Code  string `json:"code"`
	Label string `json:"label"`
}

var kyivDistricts = []districtRef{
	{Code: "holosiivskyi", Label: "Голосіївський"},
	{Code: "obolonskyi", Label: "Оболонський"},
	{Code: "pecherskyi", Label: "Печерський"},
	{Code: "podilskyi", Label: "Подільський"},
	{Code: "sviatoshynskyi", Label: "Святошинський"},
	{Code: "solomianskyi", Label: "Солом'янський"},
	{Code: "shevchenkivskyi", Label: "Шевченківський"},
	{Code: "darnytskyi", Label: "Дарницький"},
	{Code: "desnianskyi", Label: "Деснянський"},
	{Code: "dniprovskyi", Label: "Дніпровський"},
}

type limitsRef struct {
	EventTitleMax           int `json:"event_title_max"`
	EventDescriptionMax     int `json:"event_description_max"`
	FeedbackTextMax         int `json:"feedback_text_max"`
	DocPhotoMaxMb           int `json:"doc_photo_max_mb"`
	GroupMaxSeats           int `json:"group_max_seats"`
	GroupConfirmWindowHours int `json:"group_confirm_window_hours"`
}

var limits = limitsRef{
	EventTitleMax:           80,
	EventDescriptionMax:     150,
	FeedbackTextMax:         300,
	DocPhotoMaxMb:           10,
	GroupMaxSeats:           4,
	GroupConfirmWindowHours: 24,
}

func (h *ReferenceHandler) DocumentTypes(ctx *fasthttp.RequestCtx) {
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{"items": documentTypes})
}

func (h *ReferenceHandler) EventCategories(ctx *fasthttp.RequestCtx) {
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{"items": eventCategories})
}

func (h *ReferenceHandler) Cities(ctx *fasthttp.RequestCtx) {
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{"items": cities})
}

func (h *ReferenceHandler) Districts(ctx *fasthttp.RequestCtx) {
	city := string(ctx.QueryArgs().Peek("city"))
	if city != "" && city != "Київ" {
		server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{"items": []districtRef{}})
		return
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]any{"items": kyivDistricts})
}

func (h *ReferenceHandler) Limits(ctx *fasthttp.RequestCtx) {
	server.RespondJSON(ctx, fasthttp.StatusOK, limits)
}
