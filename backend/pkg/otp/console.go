package otp

import (
	"context"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

type ConsoleSender struct {
	log *logger.Logger
}

func NewConsoleSender(log *logger.Logger) *ConsoleSender {
	return &ConsoleSender{log: log}
}

func (c *ConsoleSender) Send(_ context.Context, phone, code string) error {
	c.log.Info("OTP", "phone", phone, "code", code)
	return nil
}
