package aivision

import (
	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

func NewVerifier(cfg *config.Config, log *logger.Logger) Verifier {
	if cfg.OpenAIKey == "" {
		log.Warn("aivision: stub (OPENAI_API_KEY not set)")
		return NewStubVerifier(log)
	}
	log.Info("aivision: openai", "model", cfg.OpenAIModel)
	return NewOpenAIVerifier(cfg.OpenAIKey, cfg.OpenAIModel)
}
