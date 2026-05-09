package http_handler

import (
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
)

func multiString(args *fasthttp.Args, key string) []string {
	raw := args.PeekMulti(key)
	out := make([]string, 0, len(raw))
	for _, b := range raw {
		if s := string(b); s != "" {
			out = append(out, s)
		}
	}
	return out
}

func optString(args *fasthttp.Args, key string) *string {
	if !args.Has(key) {
		return nil
	}
	s := string(args.Peek(key))
	if s == "" {
		return nil
	}
	return &s
}

func optBool(args *fasthttp.Args, key string) *bool {
	if !args.Has(key) {
		return nil
	}
	s := strings.ToLower(string(args.Peek(key)))
	b := s == "true" || s == "1" || s == "yes"
	return &b
}

func optInt(args *fasthttp.Args, key string) int {
	if !args.Has(key) {
		return 0
	}
	n, err := strconv.Atoi(string(args.Peek(key)))
	if err != nil {
		panic(apperrors.NewValidationError("invalid integer for "+key, nil))
	}
	return n
}

func optTime(args *fasthttp.Args, key string) *time.Time {
	if !args.Has(key) {
		return nil
	}
	s := string(args.Peek(key))
	if s == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(apperrors.NewValidationError("invalid timestamp for "+key+" (expect RFC3339)", nil))
	}
	return &t
}

func optUUID(args *fasthttp.Args, key string) *uuid.UUID {
	if !args.Has(key) {
		return nil
	}
	id, err := uuid.Parse(string(args.Peek(key)))
	if err != nil {
		panic(apperrors.NewValidationError("invalid uuid for "+key, nil))
	}
	return &id
}

func pathUUID(ctx *fasthttp.RequestCtx, key string) uuid.UUID {
	v := ctx.UserValue(key)
	if v == nil {
		panic(apperrors.NewValidationError("missing path param "+key, nil))
	}
	id, err := uuid.Parse(v.(string))
	if err != nil {
		panic(apperrors.NewValidationError("invalid uuid in path", nil))
	}
	return id
}
