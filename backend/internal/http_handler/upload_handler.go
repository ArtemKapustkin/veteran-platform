package http_handler

import (
	"bytes"
	"fmt"
	"io"
	"strings"

	fhrouter "github.com/fasthttp/router"
	"github.com/google/uuid"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/apperrors"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/server"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/storage"
)

const maxImageBytes = 10 * 1024 * 1024

var allowedImageMimes = map[string]string{
	"image/jpeg": ".jpg",
	"image/jpg":  ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

type UploadHandler struct {
	uploader storage.Uploader
	auth     *server.AuthMiddleware
}

func NewUploadHandler(uploader storage.Uploader, auth *server.AuthMiddleware) *UploadHandler {
	return &UploadHandler{uploader: uploader, auth: auth}
}

func RegisterUploadHandler(r *fhrouter.Router, h *UploadHandler) {
	r.POST("/api/v1/me/uploads/event-cover", h.auth.RequireVeteran(h.EventCover))
}

func (h *UploadHandler) EventCover(ctx *fasthttp.RequestCtx) {
	form, err := ctx.MultipartForm()
	if err != nil {
		panic(apperrors.NewValidationError("invalid multipart form", nil))
	}
	fhs := form.File["file"]
	if len(fhs) == 0 {
		panic(apperrors.NewValidationError("file required (field name 'file')", nil))
	}
	fh := fhs[0]
	if fh.Size > maxImageBytes {
		panic(apperrors.NewValidationError(fmt.Sprintf("file exceeds %d MB", maxImageBytes/1024/1024), nil))
	}
	mime := strings.ToLower(fh.Header.Get("Content-Type"))
	ext, ok := allowedImageMimes[mime]
	if !ok {
		panic(apperrors.NewValidationError("unsupported file type: "+mime, nil))
	}

	f, err := fh.Open()
	if err != nil {
		panic(apperrors.NewInternalError("read upload: " + err.Error()))
	}
	defer f.Close()
	var buf bytes.Buffer
	if _, err := io.Copy(&buf, f); err != nil {
		panic(apperrors.NewInternalError("buffer upload: " + err.Error()))
	}

	key := fmt.Sprintf("event-covers/%s%s", uuid.New().String(), ext)
	url, err := h.uploader.Upload(ctx, key, mime, &buf)
	if err != nil {
		panic(apperrors.NewInternalError("upload failed: " + err.Error()))
	}
	server.RespondJSON(ctx, fasthttp.StatusOK, map[string]string{"url": url})
}
