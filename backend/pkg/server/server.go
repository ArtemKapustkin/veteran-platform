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
	s.http = &fasthttp.Server{Handler: s.handler()}

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
		s.router.Handler(ctx)
	}
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
