package otp

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
)

type Sender interface {
	SendCode(ctx context.Context, phone, code string) error
	SendInvitation(ctx context.Context, phone, eventTitle string) error
}

func GenerateCode(length int) (string, error) {
	if length < 4 || length > 8 {
		length = 6
	}
	max := int64(1)
	for i := 0; i < length; i++ {
		max *= 10
	}
	n, err := rand.Int(rand.Reader, big.NewInt(max))
	if err != nil {
		return "", fmt.Errorf("otp generate: %w", err)
	}
	return fmt.Sprintf("%0*d", length, n.Int64()), nil
}

func HashCode(code string) string {
	sum := sha256.Sum256([]byte(code))
	return hex.EncodeToString(sum[:])
}
