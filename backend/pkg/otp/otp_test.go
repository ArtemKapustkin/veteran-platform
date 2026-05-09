package otp_test

import (
	"strconv"
	"testing"

	"github.com/ArtemKapustkin/veteran-platform/backend/pkg/otp"
)

func TestGenerateCode_Length(t *testing.T) {
	for _, n := range []int{4, 6, 8} {
		code, err := otp.GenerateCode(n)
		if err != nil {
			t.Fatalf("len %d: %v", n, err)
		}
		if len(code) != n {
			t.Errorf("len %d: got %d (%q)", n, len(code), code)
		}
		if _, err := strconv.Atoi(code); err != nil {
			t.Errorf("len %d: not numeric: %q", n, code)
		}
	}
}

func TestGenerateCode_OutOfRangeFallsBackToSix(t *testing.T) {
	c, err := otp.GenerateCode(99)
	if err != nil {
		t.Fatal(err)
	}
	if len(c) != 6 {
		t.Errorf("expected fallback to 6, got %d", len(c))
	}
}

func TestHashCode_Stable(t *testing.T) {
	if otp.HashCode("123456") != otp.HashCode("123456") {
		t.Error("hash should be deterministic")
	}
	if otp.HashCode("123456") == otp.HashCode("000000") {
		t.Error("different codes should hash differently")
	}
}
