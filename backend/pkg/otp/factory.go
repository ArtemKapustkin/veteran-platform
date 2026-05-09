package otp

import (
	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

func NewSender(cfg *config.Config, log *logger.Logger) Sender {
	if cfg.TwilioSID != "" && cfg.TwilioToken != "" && cfg.TwilioFrom != "" {
		log.Info("OTP sender: twilio")
		return NewTwilioSender(cfg.TwilioSID, cfg.TwilioToken, cfg.TwilioFrom)
	}
	log.Warn("OTP sender: console (Twilio credentials not configured)")
	return NewConsoleSender(log)
}
