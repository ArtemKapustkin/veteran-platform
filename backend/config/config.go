package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	HTTPPort int `env:"HTTP_PORT" envDefault:"8088"`

	DBHost string `env:"DB_HOST" envDefault:"localhost"`
	DBPort int    `env:"DB_PORT" envDefault:"5432"`
	DBUser string `env:"DB_USER,required"`
	DBPass string `env:"DB_PASS,required"`
	DBName string `env:"DB_NAME,required"`

	LogLevel string `env:"LOG_LEVEL" envDefault:"info"`

	JWTSecret      string        `env:"JWT_SECRET" envDefault:"dev-secret-please-change-me-in-production-32b"`
	AuthAccessTTL  time.Duration `env:"AUTH_ACCESS_TTL" envDefault:"15m"`
	AuthRefreshTTL time.Duration `env:"AUTH_REFRESH_TTL" envDefault:"720h"`

	OTPLength int           `env:"OTP_LENGTH" envDefault:"6"`
	OTPTTL    time.Duration `env:"OTP_TTL" envDefault:"5m"`

	TwilioSID   string `env:"TWILIO_ACCOUNT_SID" envDefault:""`
	TwilioToken string `env:"TWILIO_AUTH_TOKEN" envDefault:""`
	TwilioFrom  string `env:"TWILIO_FROM" envDefault:""`

	OpenAIKey         string `env:"OPENAI_API_KEY" envDefault:""`
	OpenAIAssistantID string `env:"OPENAI_ASSISTANT_ID" envDefault:""`
}

func Load() (*Config, error) {
	var c Config
	if err := env.Parse(&c); err != nil {
		return nil, fmt.Errorf("config: %w", err)
	}
	return &c, nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=disable",
		c.DBUser, c.DBPass, c.DBHost, c.DBPort, c.DBName,
	)
}
