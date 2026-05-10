package config

import (
	"fmt"
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	HTTPPort int `env:"HTTP_PORT" envDefault:"8088"`

	DBHost    string `env:"DB_HOST" envDefault:"localhost"`
	DBPort    int    `env:"DB_PORT" envDefault:"5432"`
	DBUser    string `env:"DB_USER,required"`
	DBPass    string `env:"DB_PASS,required"`
	DBName    string `env:"DB_NAME,required"`
	DBSSLMode string `env:"DB_SSLMODE" envDefault:"disable"`

	LogLevel string `env:"LOG_LEVEL" envDefault:"info"`

	JWTSecret      string        `env:"JWT_SECRET" envDefault:"dev-secret-please-change-me-in-production-32b"`
	AuthAccessTTL  time.Duration `env:"AUTH_ACCESS_TTL" envDefault:"15m"`
	AuthRefreshTTL time.Duration `env:"AUTH_REFRESH_TTL" envDefault:"720h"`

	OTPLength int           `env:"OTP_LENGTH" envDefault:"6"`
	OTPTTL    time.Duration `env:"OTP_TTL" envDefault:"5m"`

	SMSProvider string `env:"SMS_PROVIDER" envDefault:""`

	TwilioSID   string `env:"TWILIO_ACCOUNT_SID" envDefault:""`
	TwilioToken string `env:"TWILIO_AUTH_TOKEN" envDefault:""`
	TwilioFrom  string `env:"TWILIO_FROM" envDefault:""`

	TurboSMSToken  string `env:"TURBOSMS_TOKEN" envDefault:""`
	TurboSMSSender string `env:"TURBOSMS_SENDER" envDefault:""`

	SMSFlyAPIKey string `env:"SMSFLY_API_KEY" envDefault:""`
	SMSFlySender string `env:"SMSFLY_SENDER" envDefault:""`
	SMSFlyURL    string `env:"SMSFLY_URL" envDefault:"https://sms-fly.ua/api2/json.php"`

	OpenAIKey         string `env:"OPENAI_API_KEY" envDefault:""`
	OpenAIAssistantID string `env:"OPENAI_ASSISTANT_ID" envDefault:""`

	GCSBucket          string `env:"GCS_BUCKET" envDefault:""`
	UploadsLocalDir    string `env:"UPLOADS_LOCAL_DIR" envDefault:"/tmp/veteran-platform-uploads"`
	UploadsPublicBase  string `env:"UPLOADS_PUBLIC_BASE" envDefault:""`
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
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.DBUser, c.DBPass, c.DBHost, c.DBPort, c.DBName, c.DBSSLMode,
	)
}
