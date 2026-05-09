package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type AuthHandler struct {
	auth *application.AuthService
}

func NewAuthHandler(auth *application.AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func RegisterAuthHandler(r *fhrouter.Router, h *AuthHandler) {
	r.POST("/api/v1/auth/otp/request", h.RequestOTP)
	r.POST("/api/v1/auth/otp/verify", h.VerifyOTP)
	r.POST("/api/v1/auth/refresh", h.Refresh)
	r.POST("/api/v1/auth/logout", h.Logout)
}

type otpRequestReq struct {
	Phone string `json:"phone"`
}

func (r *otpRequestReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Phone, validation.Required, PhoneRule),
	)
}

func (h *AuthHandler) RequestOTP(ctx *fasthttp.RequestCtx) {
	var req otpRequestReq
	server.DecodeJSON(ctx, &req)
	if err := h.auth.RequestOTP(ctx, req.Phone); err != nil {
		panic(err)
	}
	ctx.SetStatusCode(fasthttp.StatusAccepted)
}

type otpVerifyReq struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
}

func (r *otpVerifyReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.Phone, validation.Required, PhoneRule),
		validation.Field(&r.Code, validation.Required, validation.Length(4, 8)),
	)
}

func (h *AuthHandler) VerifyOTP(ctx *fasthttp.RequestCtx) {
	var req otpVerifyReq
	server.DecodeJSON(ctx, &req)
	res, err := h.auth.VerifyOTP(ctx, req.Phone, req.Code)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

func (r *refreshReq) Validate() error {
	return validation.ValidateStruct(r,
		validation.Field(&r.RefreshToken, validation.Required, validation.Length(20, 200)),
	)
}

func (h *AuthHandler) Refresh(ctx *fasthttp.RequestCtx) {
	var req refreshReq
	server.DecodeJSON(ctx, &req)
	res, err := h.auth.Refresh(ctx, req.RefreshToken)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *AuthHandler) Logout(ctx *fasthttp.RequestCtx) {
	var req refreshReq
	server.DecodeJSON(ctx, &req)
	if err := h.auth.Logout(ctx, req.RefreshToken); err != nil {
		panic(err)
	}
	server.RespondNoContent(ctx)
}
