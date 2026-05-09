package server

import (
	"strings"

	"github.com/google/uuid"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/auth"
)

const (
	ctxKeyVeteranID = "veteran_id"
	ctxKeyRole      = "role"
)

type AuthMiddleware struct {
	jwt *auth.JWT
}

func NewAuthMiddleware(jwt *auth.JWT) *AuthMiddleware {
	return &AuthMiddleware{jwt: jwt}
}

func (m *AuthMiddleware) RequireVeteran(next fasthttp.RequestHandler) fasthttp.RequestHandler {
	return func(ctx *fasthttp.RequestCtx) {
		claims := m.parseClaims(ctx)
		if claims.Role != auth.RoleVeteran && claims.Role != auth.RoleAdmin {
			panic(apperrors.NewForbiddenError("veteran role required"))
		}
		ctx.SetUserValue(ctxKeyVeteranID, claims.Subject)
		ctx.SetUserValue(ctxKeyRole, string(claims.Role))
		next(ctx)
	}
}

func (m *AuthMiddleware) RequireAdmin(next fasthttp.RequestHandler) fasthttp.RequestHandler {
	return func(ctx *fasthttp.RequestCtx) {
		claims := m.parseClaims(ctx)
		if claims.Role != auth.RoleAdmin {
			panic(apperrors.NewForbiddenError("admin role required"))
		}
		ctx.SetUserValue(ctxKeyVeteranID, claims.Subject)
		ctx.SetUserValue(ctxKeyRole, string(claims.Role))
		next(ctx)
	}
}

func (m *AuthMiddleware) parseClaims(ctx *fasthttp.RequestCtx) *auth.Claims {
	h := string(ctx.Request.Header.Peek("Authorization"))
	if !strings.HasPrefix(h, "Bearer ") {
		panic(apperrors.NewUnauthorizedError("missing bearer token"))
	}
	token := strings.TrimPrefix(h, "Bearer ")
	claims, err := m.jwt.Verify(token)
	if err != nil {
		panic(apperrors.NewUnauthorizedError("invalid or expired token"))
	}
	return claims
}

func VeteranID(ctx *fasthttp.RequestCtx) uuid.UUID {
	v := ctx.UserValue(ctxKeyVeteranID)
	if v == nil {
		panic(apperrors.NewUnauthorizedError("missing auth context"))
	}
	if id, ok := v.(uuid.UUID); ok {
		return id
	}
	panic(apperrors.NewInternalError("invalid auth context"))
}

func RoleFromCtx(ctx *fasthttp.RequestCtx) string {
	v := ctx.UserValue(ctxKeyRole)
	s, _ := v.(string)
	return s
}
