package http_handler

import (
	fhrouter "github.com/fasthttp/router"
	"github.com/valyala/fasthttp"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/storage"
)

func RegisterLocalUploadsRoute(r *fhrouter.Router, cfg *config.Config, uploader storage.Uploader) {
	if _, ok := uploader.(*storage.LocalUploader); !ok {
		return
	}
	r.GET("/uploads/{filepath:*}", fasthttp.FSHandler(cfg.UploadsLocalDir, 1))
}
