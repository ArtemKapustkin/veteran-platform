package http_handler

import (
	"io"

	fhrouter "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/internal/service/application"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
)

type VerificationHandler struct {
	verification *application.VerificationService
	auth         *server.AuthMiddleware
}

func NewVerificationHandler(verification *application.VerificationService, auth *server.AuthMiddleware) *VerificationHandler {
	return &VerificationHandler{verification: verification, auth: auth}
}

func RegisterVerificationHandler(r *fhrouter.Router, h *VerificationHandler) {
	r.GET("/api/v1/me/verification", h.auth.RequireVeteran(h.GetState))
	r.POST("/api/v1/me/verification", h.auth.RequireVeteran(h.Submit))
}

func (h *VerificationHandler) GetState(ctx *fasthttp.RequestCtx) {
	id := server.VeteranID(ctx)
	res, err := h.verification.GetState(ctx, id)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, res)
}

func (h *VerificationHandler) Submit(ctx *fasthttp.RequestCtx) {
	form, err := ctx.MultipartForm()
	if err != nil {
		panic(apperrors.NewValidationError("invalid multipart form", nil))
	}
	docTypeVals := form.Value["document_type"]
	if len(docTypeVals) == 0 || docTypeVals[0] == "" {
		panic(apperrors.NewValidationError("document_type required", nil))
	}
	fileHeaders := form.File["files"]
	if len(fileHeaders) == 0 {
		panic(apperrors.NewValidationError("at least one file required (field name 'files')", nil))
	}
	if len(fileHeaders) > 5 {
		panic(apperrors.NewValidationError("max 5 files per submission", nil))
	}

	files := make([]application.VerificationFile, 0, len(fileHeaders))
	for _, fh := range fileHeaders {
		if fh.Size > 10*1024*1024 {
			panic(apperrors.NewValidationError("file exceeds 10 MB: "+fh.Filename, nil))
		}
		f, err := fh.Open()
		if err != nil {
			panic(apperrors.NewInternalError("read upload: " + err.Error()))
		}
		data, err := io.ReadAll(f)
		_ = f.Close()
		if err != nil {
			panic(apperrors.NewInternalError("read upload bytes: " + err.Error()))
		}
		mime := fh.Header.Get("Content-Type")
		files = append(files, application.VerificationFile{Bytes: data, Mime: mime})
	}

	id := server.VeteranID(ctx)
	res, err := h.verification.Submit(ctx, id, docTypeVals[0], files)
	if err != nil {
		panic(err)
	}
	server.RespondJSON(ctx, fasthttp.StatusAccepted, res)
}
