package server

import (
	"context"
	"encoding/json"
	"fmt"

	fhrouter "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

type Server struct {
	router *fhrouter.Router
	http   *fasthttp.Server
	port   int
	log    *logger.Logger
}

func NewRouter() *fhrouter.Router {
	return fhrouter.New()
}

func New(lc fx.Lifecycle, cfg *config.Config, log *logger.Logger, r *fhrouter.Router) *Server {
	s := &Server{
		router: r,
		port:   cfg.HTTPPort,
		log:    log,
	}
	s.http = &fasthttp.Server{
		Handler:            s.handler(),
		MaxRequestBodySize: 16 * 1024 * 1024,
	}

	lc.Append(fx.Hook{
		OnStart: func(_ context.Context) error {
			addr := fmt.Sprintf(":%d", s.port)
			s.log.Info("http server starting", "addr", addr)
			go func() {
				if err := s.http.ListenAndServe(addr); err != nil {
					s.log.Error("http server stopped", "err", err)
				}
			}()
			return nil
		},
		OnStop: func(ctx context.Context) error {
			return s.http.ShutdownWithContext(ctx)
		},
	})

	return s
}

func (s *Server) handler() fasthttp.RequestHandler {
	return func(ctx *fasthttp.RequestCtx) {
		defer func() {
			if r := recover(); r != nil {
				s.recover(ctx, r)
			}
		}()
		applyCORS(ctx)
		if string(ctx.Method()) == fasthttp.MethodOptions {
			ctx.SetStatusCode(fasthttp.StatusNoContent)
			return
		}
		s.router.Handler(ctx)
	}
}

// applyCORS reflects the request Origin (any origin allowed in dev) and
// advertises the headers/methods used by the SPA. Mutating, JSON-bodied
// requests trigger preflights, so we must answer OPTIONS unconditionally.
func applyCORS(ctx *fasthttp.RequestCtx) {
	origin := string(ctx.Request.Header.Peek("Origin"))
	if origin == "" {
		origin = "*"
	}
	h := &ctx.Response.Header
	h.Set("Access-Control-Allow-Origin", origin)
	h.Set("Vary", "Origin")
	h.Set("Access-Control-Allow-Credentials", "true")
	h.Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	reqHeaders := string(ctx.Request.Header.Peek("Access-Control-Request-Headers"))
	if reqHeaders == "" {
		reqHeaders = "Authorization, Content-Type, Accept"
	}
	h.Set("Access-Control-Allow-Headers", reqHeaders)
	h.Set("Access-Control-Max-Age", "600")
}

func (s *Server) recover(ctx *fasthttp.RequestCtx, r any) {
	if appErr, ok := r.(*apperrors.Error); ok {
		s.respondError(ctx, appErr)
		return
	}
	if err, ok := r.(error); ok {
		if appErr, isApp := apperrors.As(err); isApp {
			s.respondError(ctx, appErr)
			return
		}
		s.log.Error("panic in handler", "err", err.Error(), "path", string(ctx.Path()))
	} else {
		s.log.Error("panic in handler", "err", r, "path", string(ctx.Path()))
	}
	s.respondError(ctx, apperrors.NewInternalError("unexpected error"))
}

func (s *Server) respondError(ctx *fasthttp.RequestCtx, e *apperrors.Error) {
	ctx.SetStatusCode(e.Status)
	ctx.SetContentType("application/json")
	body := map[string]any{"code": string(e.Code), "message": e.Message}
	if len(e.Details) > 0 {
		body["details"] = e.Details
	}
	if err := json.NewEncoder(ctx).Encode(body); err != nil {
		s.log.Error("failed to encode error response", "err", err)
	}
}
