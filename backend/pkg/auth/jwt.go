package auth

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Role string

const (
	RoleVeteran Role = "veteran"
	RoleAdmin   Role = "admin"
)

type Claims struct {
	Subject uuid.UUID
	Role    Role
}

type JWT struct {
	secret     []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewJWT(secret string, accessTTL, refreshTTL time.Duration) *JWT {
	return &JWT{
		secret:     []byte(secret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
	}
}

func (j *JWT) AccessTTL() time.Duration  { return j.accessTTL }
func (j *JWT) RefreshTTL() time.Duration { return j.refreshTTL }

func (j *JWT) Issue(sub uuid.UUID, role Role) (string, error) {
	now := time.Now()
	claims := jwtlib.MapClaims{
		"sub":  sub.String(),
		"role": string(role),
		"iat":  now.Unix(),
		"exp":  now.Add(j.accessTTL).Unix(),
	}
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	signed, err := token.SignedString(j.secret)
	if err != nil {
		return "", fmt.Errorf("jwt sign: %w", err)
	}
	return signed, nil
}

func (j *JWT) Verify(tokenStr string) (*Claims, error) {
	token, err := jwtlib.Parse(tokenStr, func(t *jwtlib.Token) (any, error) {
		if _, ok := t.Method.(*jwtlib.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return j.secret, nil
	})
	if err != nil {
		return nil, fmt.Errorf("jwt parse: %w", err)
	}
	if !token.Valid {
		return nil, fmt.Errorf("jwt invalid")
	}
	mc, ok := token.Claims.(jwtlib.MapClaims)
	if !ok {
		return nil, fmt.Errorf("jwt claims invalid")
	}
	subStr, _ := mc["sub"].(string)
	roleStr, _ := mc["role"].(string)
	id, err := uuid.Parse(subStr)
	if err != nil {
		return nil, fmt.Errorf("jwt sub invalid: %w", err)
	}
	return &Claims{Subject: id, Role: Role(roleStr)}, nil
}

func GenerateRefreshToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("refresh token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}
