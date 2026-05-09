package aivision

import (
	"github.com/ArtemKapustkin/veteran-platform/backend/config"
	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

func NewVerifier(cfg *config.Config, log *logger.Logger) Verifier {
	if cfg.OpenAIKey == "" || cfg.OpenAIAssistantID == "" {
		log.Warn("aivision: stub (OPENAI_API_KEY or OPENAI_ASSISTANT_ID not set)")
		return NewStubVerifier(log)
	}
	log.Info("aivision: openai assistants v2", "assistant_id", cfg.OpenAIAssistantID)
	return NewOpenAIVerifier(cfg.OpenAIKey, cfg.OpenAIAssistantID)
}
