package otp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type SMSFlySender struct {
	apiKey string
	sender string
	url    string
	client *http.Client
}

func NewSMSFlySender(apiKey, sender, url string) *SMSFlySender {
	if url == "" {
		url = "https://sms-fly.ua/api2/json.php"
	}
	return &SMSFlySender{
		apiKey: apiKey,
		sender: sender,
		url:    url,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (s *SMSFlySender) SendCode(ctx context.Context, phone, code string) error {
	body := fmt.Sprintf("Ви вже поруч! Ваш код для реєстрації на платформі Свої Поруч: %s. Не передавайте нікому.", code)
	return s.send(ctx, phone, body)
}

func (s *SMSFlySender) SendInvitation(ctx context.Context, phone, eventTitle string) error {
	body := fmt.Sprintf("Вас запросили приєднатись до групової реєстрації на подію '%s'. Увійдіть у Свої Поруч щоб підтвердити.", eventTitle)
	return s.send(ctx, phone, body)
}

type smsFlyRequest struct {
	Auth   smsFlyAuth `json:"auth"`
	Action string     `json:"action"`
	Data   smsFlyData `json:"data"`
}

type smsFlyAuth struct {
	Key string `json:"key"`
}

type smsFlyData struct {
	Recipient string    `json:"recipient"`
	Channels  string    `json:"channels"`
	SMS       smsFlySMS `json:"sms"`
}

type smsFlySMS struct {
	Source string `json:"source"`
	Text   string `json:"text"`
	TTL    int    `json:"ttl,omitempty"`
}

type smsFlyResponse struct {
	Success int            `json:"success"`
	Error   string         `json:"error"`
	Data    map[string]any `json:"data"`
}

func (s *SMSFlySender) send(ctx context.Context, phone, text string) error {
	payload, err := json.Marshal(smsFlyRequest{
		Auth:   smsFlyAuth{Key: s.apiKey},
		Action: "SENDSMS",
		Data: smsFlyData{
			Recipient: strings.TrimPrefix(phone, "+"),
			Channels:  "Sms",
			SMS: smsFlySMS{
				Source: s.sender,
				Text:   text,
				TTL:    60,
			},
		},
	})
	if err != nil {
		return fmt.Errorf("smsfly marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, "POST", s.url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("smsfly request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("smsfly do: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("smsfly read: %w", err)
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("smsfly http %d: %s", resp.StatusCode, truncateMsg(string(raw), 200))
	}
	var r smsFlyResponse
	if err := json.Unmarshal(raw, &r); err != nil {
		return fmt.Errorf("smsfly parse: %w (body=%s)", err, truncateMsg(string(raw), 200))
	}
	if r.Success != 1 {
		return fmt.Errorf("smsfly api error: %s (raw=%s)", r.Error, truncateMsg(string(raw), 200))
	}
	return nil
}
