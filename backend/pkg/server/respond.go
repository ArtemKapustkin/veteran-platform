package server

import (
	"encoding/json"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
)

type Validatable interface {
	Validate() error
}

func DecodeJSON(ctx *fasthttp.RequestCtx, dst Validatable) {
	if err := json.Unmarshal(ctx.PostBody(), dst); err != nil {
		panic(apperrors.NewValidationError("invalid JSON body", nil))
	}
	if err := dst.Validate(); err != nil {
		if errs, ok := err.(validation.Errors); ok {
			details := make(map[string]any, len(errs))
			for k, v := range errs {
				details[k] = v.Error()
			}
			panic(apperrors.NewValidationError("validation failed", details))
		}
		panic(apperrors.NewValidationError(err.Error(), nil))
	}
}

func RespondJSON(ctx *fasthttp.RequestCtx, status int, body any) {
	ctx.SetStatusCode(status)
	ctx.SetContentType("application/json")
	if err := json.NewEncoder(ctx).Encode(body); err != nil {
		panic(apperrors.NewInternalError(err.Error()))
	}
}

func RespondNoContent(ctx *fasthttp.RequestCtx) {
	ctx.SetStatusCode(fasthttp.StatusNoContent)
}
