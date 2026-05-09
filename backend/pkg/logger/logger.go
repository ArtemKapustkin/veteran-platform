package logger

import (
	"log/slog"
	"os"
	"strings"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
)

type Logger = slog.Logger

func New(cfg *config.Config) *Logger {
	level := slog.LevelInfo
	switch strings.ToLower(cfg.LogLevel) {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level}))
}
