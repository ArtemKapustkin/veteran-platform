package aivision

import (
	"context"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/logger"
)

type StubVerifier struct {
	log *logger.Logger
}

func NewStubVerifier(log *logger.Logger) *StubVerifier {
	return &StubVerifier{log: log}
}

func (s *StubVerifier) Verify(_ context.Context, image []byte, mime, documentType, expectedName string) (*Result, error) {
	s.log.Info("aivision stub verify",
		"mime", mime,
		"document_type", documentType,
		"expected_name", expectedName,
		"bytes", len(image),
	)
	return &Result{
		Decision:      "match",
		Confidence:    0.85,
		ExtractedName: expectedName,
		Notes:         "stub verifier (OPENAI_API_KEY not set)",
	}, nil
}
