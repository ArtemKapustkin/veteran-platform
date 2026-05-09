package storage

import (
	"context"
	"fmt"

	"go.uber.org/fx"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

func NewUploader(lc fx.Lifecycle, cfg *config.Config, log *logger.Logger) (Uploader, error) {
	if cfg.GCSBucket != "" {
		log.Info("storage: gcs", "bucket", cfg.GCSBucket)
		u, err := NewGCSUploader(context.Background(), cfg.GCSBucket)
		if err != nil {
			return nil, err
		}
		lc.Append(fx.Hook{
			OnStop: func(_ context.Context) error { return u.Close() },
		})
		return u, nil
	}
	publicBase := cfg.UploadsPublicBase
	if publicBase == "" {
		publicBase = fmt.Sprintf("http://localhost:%d/uploads", cfg.HTTPPort)
	}
	log.Info("storage: local", "dir", cfg.UploadsLocalDir, "public_base", publicBase)
	return NewLocalUploader(cfg.UploadsLocalDir, publicBase)
}
