package storage

import (
	"context"
	"fmt"
	"io"

	"cloud.google.com/go/storage"
)

type GCSUploader struct {
	client *storage.Client
	bucket string
}

func NewGCSUploader(ctx context.Context, bucket string) (*GCSUploader, error) {
	if bucket == "" {
		return nil, fmt.Errorf("gcs uploader: bucket is required")
	}
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcs client: %w", err)
	}
	return &GCSUploader{client: client, bucket: bucket}, nil
}

func (g *GCSUploader) Upload(ctx context.Context, key, contentType string, body io.Reader) (string, error) {
	obj := g.client.Bucket(g.bucket).Object(key)
	w := obj.NewWriter(ctx)
	w.ContentType = contentType
	w.CacheControl = "public, max-age=31536000, immutable"
	if _, err := io.Copy(w, body); err != nil {
		_ = w.Close()
		return "", fmt.Errorf("gcs write: %w", err)
	}
	if err := w.Close(); err != nil {
		return "", fmt.Errorf("gcs close: %w", err)
	}
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", g.bucket, key), nil
}

func (g *GCSUploader) Close() error {
	return g.client.Close()
}
