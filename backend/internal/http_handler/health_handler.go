package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	"github.com/uptrace/bun"
	"github.com/valyala/fasthttp"
)

type HealthHandler struct {
	db *bun.DB
}

func NewHealthHandler(db *bun.DB) *HealthHandler {
	return &HealthHandler{db: db}
}

func RegisterHealthHandler(r *fhrouter.Router, h *HealthHandler) {
	r.GET("/healthz", h.Healthz)
}

func (h *HealthHandler) Healthz(ctx *fasthttp.RequestCtx) {
	ctx.SetContentType("application/json")
	if err := h.db.PingContext(ctx); err != nil {
		ctx.SetStatusCode(fasthttp.StatusServiceUnavailable)
		ctx.SetBodyString(`{"status":"unhealthy","db":"down"}`)
		return
	}
	ctx.SetStatusCode(fasthttp.StatusOK)
	ctx.SetBodyString(`{"status":"ok"}`)
}
