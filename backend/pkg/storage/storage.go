package storage

import (
	"context"
	"io"
)

type Uploader interface {
	Upload(ctx context.Context, key, contentType string, body io.Reader) (publicURL string, err error)
}
