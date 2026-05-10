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

const turboSMSURL = "https://api.turbosms.ua/message/send.json"

type TurboSMSSender struct {
	token  string
	sender string
	client *http.Client
}

func NewTurboSMSSender(token, sender string) *TurboSMSSender {
	return &TurboSMSSender{
		token:  token,
		sender: sender,
		client: &http.Client{Timeout: 15 * time.Second},
	}
}

func (t *TurboSMSSender) SendCode(ctx context.Context, phone, code string) error {
	body := fmt.Sprintf("Veteran Platform: ваш код %s. Не передавайте нікому.", code)
	return t.send(ctx, phone, body)
}

func (t *TurboSMSSender) SendInvitation(ctx context.Context, phone, eventTitle string) error {
	body := fmt.Sprintf("Вас запросили приєднатись до групової реєстрації на подію '%s'. Увійдіть у Veteran Platform щоб підтвердити.", eventTitle)
	return t.send(ctx, phone, body)
}

type turboSMSRequest struct {
	Recipients []string    `json:"recipients"`
	SMS        turboSMSMsg `json:"sms"`
}

type turboSMSMsg struct {
	Sender string `json:"sender"`
	Text   string `json:"text"`
}

type turboSMSResponse struct {
	ResponseStatus string `json:"response_status"`
	ResponseCode   int    `json:"response_code"`
	ResponseResult []struct {
		Phone     string `json:"phone"`
		Status    string `json:"status"`
		MessageID string `json:"message_id"`
	} `json:"response_result"`
}

func (t *TurboSMSSender) send(ctx context.Context, phone, text string) error {
	body, err := json.Marshal(turboSMSRequest{
		Recipients: []string{strings.TrimPrefix(phone, "+")},
		SMS: turboSMSMsg{
			Sender: t.sender,
			Text:   text,
		},
	})
	if err != nil {
		return fmt.Errorf("turbosms marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, "POST", turboSMSURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("turbosms request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+t.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := t.client.Do(req)
	if err != nil {
		return fmt.Errorf("turbosms do: %w", err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("turbosms read: %w", err)
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("turbosms http %d: %s", resp.StatusCode, truncateMsg(string(raw), 200))
	}
	var r turboSMSResponse
	if err := json.Unmarshal(raw, &r); err != nil {
		return fmt.Errorf("turbosms parse: %w (body=%s)", err, truncateMsg(string(raw), 200))
	}
	if r.ResponseStatus != "OK" {
		return fmt.Errorf("turbosms api: %s (code=%d)", r.ResponseStatus, r.ResponseCode)
	}
	if len(r.ResponseResult) > 0 && r.ResponseResult[0].Status != "" && !strings.EqualFold(r.ResponseResult[0].Status, "SUCCESS") {
		return fmt.Errorf("turbosms recipient %s: %s", r.ResponseResult[0].Phone, r.ResponseResult[0].Status)
	}
	return nil
}

func truncateMsg(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
