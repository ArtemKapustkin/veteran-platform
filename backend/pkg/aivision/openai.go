package aivision

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const openAIChatCompletionsURL = "https://api.openai.com/v1/chat/completions"

type OpenAIVerifier struct {
	apiKey string
	model  string
	client *http.Client
}

func NewOpenAIVerifier(apiKey, model string) *OpenAIVerifier {
	if model == "" {
		model = "gpt-4o"
	}
	return &OpenAIVerifier{
		apiKey: apiKey,
		model:  model,
		client: &http.Client{Timeout: 60 * time.Second},
	}
}

type ccImageURL struct {
	URL    string `json:"url"`
	Detail string `json:"detail,omitempty"`
}

type ccPart struct {
	Type     string      `json:"type"`
	Text     string      `json:"text,omitempty"`
	ImageURL *ccImageURL `json:"image_url,omitempty"`
}

type ccMessage struct {
	Role    string   `json:"role"`
	Content any      `json:"content"`
	parts   []ccPart `json:"-"`
}

type ccRequest struct {
	Model          string `json:"model"`
	Messages       []any  `json:"messages"`
	ResponseFormat any    `json:"response_format,omitempty"`
	MaxTokens      int    `json:"max_tokens,omitempty"`
	Temperature    *float64 `json:"temperature,omitempty"`
}

type ccChoice struct {
	Message struct {
		Content string `json:"content"`
	} `json:"message"`
}

type ccError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

type ccResponse struct {
	Choices []ccChoice `json:"choices"`
	Error   *ccError   `json:"error,omitempty"`
}

func (v *OpenAIVerifier) Verify(ctx context.Context, image []byte, mime, documentType, expectedName string) (*Result, error) {
	if mime == "" {
		mime = "image/jpeg"
	}
	dataURL := "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(image)

	system := buildSystemPrompt(documentType, expectedName)
	userMsg := map[string]any{
		"role": "user",
		"content": []ccPart{
			{Type: "text", Text: "Перевір зображення документу та поверни структурований JSON відповідно до системних інструкцій."},
			{Type: "image_url", ImageURL: &ccImageURL{URL: dataURL, Detail: "low"}},
		},
	}
	systemMsg := map[string]any{"role": "system", "content": system}

	temp := 0.0
	body := ccRequest{
		Model:    v.model,
		Messages: []any{systemMsg, userMsg},
		ResponseFormat: map[string]string{"type": "json_object"},
		MaxTokens:   500,
		Temperature: &temp,
	}
	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("openai marshal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", openAIChatCompletionsURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("openai request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+v.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := v.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai do: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("openai read: %w", err)
	}
	var cc ccResponse
	if err := json.Unmarshal(respBytes, &cc); err != nil {
		return nil, fmt.Errorf("openai parse: %w (body=%s)", err, truncate(string(respBytes), 300))
	}
	if cc.Error != nil {
		return nil, fmt.Errorf("openai api error: %s (%s)", cc.Error.Message, cc.Error.Code)
	}
	if len(cc.Choices) == 0 {
		return nil, fmt.Errorf("openai: empty choices")
	}

	content := cc.Choices[0].Message.Content
	var parsed struct {
		Decision      string  `json:"decision"`
		Confidence    float64 `json:"confidence"`
		ExtractedName string  `json:"extracted_name"`
		ExtractedID   string  `json:"extracted_id"`
		Notes         string  `json:"notes"`
	}
	if err := json.Unmarshal([]byte(content), &parsed); err != nil {
		return nil, fmt.Errorf("openai content parse: %w (content=%s)", err, truncate(content, 300))
	}
	if parsed.Decision != "match" && parsed.Decision != "no_match" && parsed.Decision != "unreadable" {
		parsed.Decision = "unreadable"
	}
	if parsed.Confidence < 0 {
		parsed.Confidence = 0
	}
	if parsed.Confidence > 1 {
		parsed.Confidence = 1
	}
	return &Result{
		Decision:      parsed.Decision,
		Confidence:    parsed.Confidence,
		ExtractedName: parsed.ExtractedName,
		ExtractedID:   parsed.ExtractedID,
		Notes:         parsed.Notes,
	}, nil
}

func buildSystemPrompt(documentType, expectedName string) string {
	docLabels := map[string]string{
		"ubd_dia":          "Е-посвідчення ветерана в Дії",
		"ubd_paper":        "Посвідчення учасника бойових дій (УБД, паперове)",
		"reestr_extract":   "Витяг з Єдиного державного реєстру ветеранів війни",
		"form_6":           "Довідка про участь у бойових діях (форма 6)",
		"military_book":    "Військовий квиток з відміткою УБД",
		"family_fallen":    "Посвідчення члена сім'ї загиблого захисника",
		"self_declaration": "Документ в процесі оформлення (само-декларація)",
	}
	docLabel := docLabels[documentType]
	if docLabel == "" {
		docLabel = documentType
	}

	var b strings.Builder
	b.WriteString("Ти — асистент для верифікації українських документів ветеранів. ")
	b.WriteString("Тебе викликають через API; твоя відповідь має бути СТРОГО валідним JSON, без жодного пояснювального тексту поза JSON.\n\n")
	b.WriteString("Користувач надсилає фото документу типу: ")
	b.WriteString(docLabel)
	b.WriteString(" (код типу: ")
	b.WriteString(documentType)
	b.WriteString(").\n\n")
	if expectedName != "" {
		b.WriteString("Очікуване ім'я власника: «")
		b.WriteString(expectedName)
		b.WriteString("». Якщо ім'я на документі не співпадає — це привід для no_match.\n\n")
	}
	b.WriteString("Завдання:\n")
	b.WriteString("1) Перевір, чи зображення дійсно показує документ заявленого типу.\n")
	b.WriteString("2) Витягни ім'я власника та номер документу, якщо вони видимі.\n")
	b.WriteString("3) Поверни рівно один JSON-об'єкт з ключами: decision, confidence, extracted_name, extracted_id, notes.\n\n")
	b.WriteString("Значення decision (рядок):\n")
	b.WriteString("- \"match\" якщо тип документу збігається і дані читабельні.\n")
	b.WriteString("- \"no_match\" якщо тип документу інший, документ підроблений або ім'я не співпадає з очікуваним.\n")
	b.WriteString("- \"unreadable\" якщо зображення розмите/обрізане/нечитабельне.\n\n")
	b.WriteString("confidence — число від 0 до 1.\n")
	b.WriteString("extracted_name та extracted_id — рядки або порожні рядки якщо не видно.\n")
	b.WriteString("notes — короткий коментар українською (1-2 речення) про причину рішення.\n")
	return b.String()
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
