package auth_test

import (
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/auth"
)

func TestJWT_RoundTrip(t *testing.T) {
	j := auth.NewJWT("test-secret-with-enough-entropy-for-test", 15*time.Minute, 720*time.Hour)
	id := uuid.New()
	tok, err := j.Issue(id, auth.RoleVeteran)
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	claims, err := j.Verify(tok)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if claims.Subject != id {
		t.Errorf("subject: want %s, got %s", id, claims.Subject)
	}
	if claims.Role != auth.RoleVeteran {
		t.Errorf("role: want veteran, got %s", claims.Role)
	}
}

func TestJWT_VerifyInvalid(t *testing.T) {
	j := auth.NewJWT("test-secret", time.Minute, time.Hour)
	if _, err := j.Verify("not-a-jwt"); err == nil {
		t.Errorf("expected error on invalid token")
	}
}

func TestJWT_VerifyExpired(t *testing.T) {
	j := auth.NewJWT("test-secret", -time.Second, time.Hour)
	id := uuid.New()
	tok, _ := j.Issue(id, auth.RoleVeteran)
	if _, err := j.Verify(tok); err == nil {
		t.Errorf("expected error on expired token")
	}
}

func TestGenerateRefreshToken_Unique(t *testing.T) {
	a, err := auth.GenerateRefreshToken()
	if err != nil {
		t.Fatal(err)
	}
	b, err := auth.GenerateRefreshToken()
	if err != nil {
		t.Fatal(err)
	}
	if a == b {
		t.Errorf("expected unique refresh tokens, got duplicate")
	}
	if len(a) < 40 {
		t.Errorf("refresh token too short: %d chars", len(a))
	}
}
