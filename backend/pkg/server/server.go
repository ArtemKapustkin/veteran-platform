package server

import (
	"context"
	"fmt"

	fhrouter "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"
	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
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
				s.log.Error("panic in handler", "err", r, "path", string(ctx.Path()))
				ctx.SetStatusCode(fasthttp.StatusInternalServerError)
				ctx.SetContentType("application/json")
				ctx.SetBodyString(`{"code":"internal_error","message":"unexpected error"}`)
			}
		}()
		s.router.Handler(ctx)
	}
}
