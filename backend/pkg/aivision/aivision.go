package aivision

import "context"

type Result struct {
	Decision      string
	Confidence    float64
	ExtractedName string
	Surname       string
	GivenName     string
	ExtractedID   string
	Notes         string
}

type Verifier interface {
	Verify(ctx context.Context, image []byte, mime, documentType, expectedName string) (*Result, error)
}
