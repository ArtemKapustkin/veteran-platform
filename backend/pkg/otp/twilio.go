package otp

import (
	"context"
	"fmt"

	"github.com/twilio/twilio-go"
	twapi "github.com/twilio/twilio-go/rest/api/v2010"
)

type TwilioSender struct {
	client *twilio.RestClient
	from   string
}

func NewTwilioSender(sid, token, from string) *TwilioSender {
	client := twilio.NewRestClientWithParams(twilio.ClientParams{
		Username: sid,
		Password: token,
	})
	return &TwilioSender{client: client, from: from}
}

func (t *TwilioSender) Send(_ context.Context, phone, code string) error {
	body := fmt.Sprintf("Veteran Platform: ваш код %s. Не передавайте нікому.", code)
	params := &twapi.CreateMessageParams{}
	params.SetTo(phone)
	params.SetFrom(t.from)
	params.SetBody(body)
	if _, err := t.client.Api.CreateMessage(params); err != nil {
		return fmt.Errorf("twilio: %w", err)
	}
	return nil
}
