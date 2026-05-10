package otp

import (
	"strings"

	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

func NewSender(cfg *config.Config, log *logger.Logger) Sender {
	provider := strings.ToLower(cfg.SMSProvider)
	if provider == "" {
		switch {
		case cfg.TurboSMSToken != "":
			provider = "turbosms"
		case cfg.TwilioSID != "" && cfg.TwilioToken != "" && cfg.TwilioFrom != "":
			provider = "twilio"
		default:
			provider = "console"
		}
	}

	switch provider {
	case "turbosms":
		if cfg.TurboSMSToken == "" {
			log.Warn("OTP sender: turbosms requested but TURBOSMS_TOKEN not set, falling back to console")
			return NewConsoleSender(log)
		}
		sender := cfg.TurboSMSSender
		log.Info("OTP sender: turbosms", "sender", sender)
		return NewTurboSMSSender(cfg.TurboSMSToken, sender)

	case "twilio":
		if cfg.TwilioSID == "" || cfg.TwilioToken == "" || cfg.TwilioFrom == "" {
			log.Warn("OTP sender: twilio requested but credentials incomplete, falling back to console")
			return NewConsoleSender(log)
		}
		log.Info("OTP sender: twilio", "from", cfg.TwilioFrom)
		return NewTwilioSender(cfg.TwilioSID, cfg.TwilioToken, cfg.TwilioFrom)

	default:
		log.Warn("OTP sender: console (no SMS provider configured)")
		return NewConsoleSender(log)
	}
}
