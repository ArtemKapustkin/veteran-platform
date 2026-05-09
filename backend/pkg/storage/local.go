package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type LocalUploader struct {
	dir       string
	publicURL string
}

func NewLocalUploader(dir, publicURL string) (*LocalUploader, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("local uploader mkdir: %w", err)
	}
	return &LocalUploader{
		dir:       dir,
		publicURL: strings.TrimRight(publicURL, "/"),
	}, nil
}

func (l *LocalUploader) Upload(_ context.Context, key, _ string, body io.Reader) (string, error) {
	full := filepath.Join(l.dir, filepath.FromSlash(key))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return "", fmt.Errorf("local uploader mkdir: %w", err)
	}
	f, err := os.Create(full)
	if err != nil {
		return "", fmt.Errorf("local uploader create: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, body); err != nil {
		return "", fmt.Errorf("local uploader write: %w", err)
	}
	return l.publicURL + "/" + strings.TrimLeft(key, "/"), nil
}

func (l *LocalUploader) Dir() string {
	return l.dir
}
