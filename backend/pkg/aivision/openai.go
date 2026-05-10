package aivision

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"strings"
	"time"
)

const (
	openAIBaseURL  = "https://api.openai.com/v1"
	beta           = "assistants=v2"
	pollInterval   = time.Second
	pollMaxElapsed = 90 * time.Second
)

type OpenAIVerifier struct {
	apiKey      string
	assistantID string
	client      *http.Client
}

func NewOpenAIVerifier(apiKey, assistantID string) *OpenAIVerifier {
	return &OpenAIVerifier{
		apiKey:      apiKey,
		assistantID: assistantID,
		client:      &http.Client{Timeout: 120 * time.Second},
	}
}

func (v *OpenAIVerifier) Verify(ctx context.Context, image []byte, mime, documentType, expectedName string) (*Result, error) {
	if mime == "" {
		mime = "image/jpeg"
	}

	fileID, err := v.uploadVisionFile(ctx, image, mime)
	if err != nil {
		return nil, err
	}
	defer v.deleteFile(fileID)

	threadID, err := v.createThread(ctx)
	if err != nil {
		return nil, err
	}
	defer v.deleteThread(threadID)

	if err := v.addMessage(ctx, threadID, fileID, documentType, expectedName); err != nil {
		return nil, err
	}

	runID, err := v.createRun(ctx, threadID)
	if err != nil {
		return nil, err
	}
	if err := v.waitForRun(ctx, threadID, runID); err != nil {
		return nil, err
	}

	text, err := v.latestAssistantText(ctx, threadID)
	if err != nil {
		return nil, err
	}
	return parseAssistantResponse(text), nil
}

func (v *OpenAIVerifier) request(ctx context.Context, method, path string, body any) ([]byte, error) {
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal: %w", err)
		}
		rdr = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, openAIBaseURL+path, rdr)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+v.apiKey)
	req.Header.Set("OpenAI-Beta", beta)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := v.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("openai %s %s: %w", method, path, err)
	}
	defer resp.Body.Close()
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("openai read: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("openai %s %s: %d %s", method, path, resp.StatusCode, truncate(string(respBytes), 300))
	}
	return respBytes, nil
}

func (v *OpenAIVerifier) createThread(ctx context.Context) (string, error) {
	body, err := v.request(ctx, "POST", "/threads", map[string]any{})
	if err != nil {
		return "", err
	}
	var resp struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("thread parse: %w", err)
	}
	return resp.ID, nil
}

func (v *OpenAIVerifier) deleteThread(threadID string) {
	if threadID == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = v.request(ctx, "DELETE", "/threads/"+threadID, nil)
}

func (v *OpenAIVerifier) addMessage(ctx context.Context, threadID, fileID, documentType, expectedName string) error {
	text := buildUserPrompt(documentType, expectedName)
	content := []map[string]any{
		{"type": "text", "text": text},
		{"type": "image_file", "image_file": map[string]string{"file_id": fileID, "detail": "low"}},
	}
	_, err := v.request(ctx, "POST", "/threads/"+threadID+"/messages", map[string]any{
		"role":    "user",
		"content": content,
	})
	return err
}

func (v *OpenAIVerifier) uploadVisionFile(ctx context.Context, image []byte, mime string) (string, error) {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	if err := w.WriteField("purpose", "vision"); err != nil {
		return "", fmt.Errorf("file purpose: %w", err)
	}
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", `form-data; name="file"; filename="`+visionFilename(mime)+`"`)
	h.Set("Content-Type", mime)
	part, err := w.CreatePart(h)
	if err != nil {
		return "", fmt.Errorf("file part: %w", err)
	}
	if _, err := part.Write(image); err != nil {
		return "", fmt.Errorf("file write: %w", err)
	}
	if err := w.Close(); err != nil {
		return "", fmt.Errorf("file close: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", openAIBaseURL+"/files", &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+v.apiKey)
	req.Header.Set("OpenAI-Beta", beta)
	req.Header.Set("Content-Type", w.FormDataContentType())

	resp, err := v.client.Do(req)
	if err != nil {
		return "", fmt.Errorf("openai file upload: %w", err)
	}
	defer resp.Body.Close()
	respBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("openai file upload: %d %s", resp.StatusCode, truncate(string(respBytes), 300))
	}
	var parsed struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(respBytes, &parsed); err != nil {
		return "", fmt.Errorf("file upload parse: %w", err)
	}
	if parsed.ID == "" {
		return "", fmt.Errorf("file upload: empty id (body=%s)", truncate(string(respBytes), 200))
	}
	return parsed.ID, nil
}

func (v *OpenAIVerifier) deleteFile(fileID string) {
	if fileID == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, _ = v.request(ctx, "DELETE", "/files/"+fileID, nil)
}

func visionFilename(mime string) string {
	switch mime {
	case "image/png":
		return "doc.png"
	case "image/webp":
		return "doc.webp"
	case "image/gif":
		return "doc.gif"
	default:
		return "doc.jpg"
	}
}

func (v *OpenAIVerifier) createRun(ctx context.Context, threadID string) (string, error) {
	body, err := v.request(ctx, "POST", "/threads/"+threadID+"/runs", map[string]any{
		"assistant_id":    v.assistantID,
		"response_format": map[string]string{"type": "json_object"},
	})
	if err != nil {
		return "", err
	}
	var resp struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("run parse: %w", err)
	}
	return resp.ID, nil
}

func (v *OpenAIVerifier) waitForRun(ctx context.Context, threadID, runID string) error {
	deadline := time.Now().Add(pollMaxElapsed)
	for {
		body, err := v.request(ctx, "GET", "/threads/"+threadID+"/runs/"+runID, nil)
		if err != nil {
			return err
		}
		var resp struct {
			Status      string `json:"status"`
			LastError   *struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"last_error"`
		}
		if err := json.Unmarshal(body, &resp); err != nil {
			return fmt.Errorf("run status parse: %w", err)
		}
		switch resp.Status {
		case "completed":
			return nil
		case "failed", "cancelled", "expired", "incomplete":
			msg := resp.Status
			if resp.LastError != nil {
				msg = fmt.Sprintf("%s: %s (%s)", resp.Status, resp.LastError.Message, resp.LastError.Code)
			}
			return fmt.Errorf("run terminated: %s", msg)
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("run polling timeout (last status: %s)", resp.Status)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(pollInterval):
		}
	}
}

func (v *OpenAIVerifier) latestAssistantText(ctx context.Context, threadID string) (string, error) {
	body, err := v.request(ctx, "GET", "/threads/"+threadID+"/messages?limit=10&order=desc", nil)
	if err != nil {
		return "", err
	}
	var resp struct {
		Data []struct {
			Role    string `json:"role"`
			Content []struct {
				Type string `json:"type"`
				Text struct {
					Value string `json:"value"`
				} `json:"text"`
			} `json:"content"`
		} `json:"data"`
	}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", fmt.Errorf("messages parse: %w", err)
	}
	for _, m := range resp.Data {
		if m.Role != "assistant" {
			continue
		}
		var b strings.Builder
		for _, c := range m.Content {
			if c.Type == "text" {
				b.WriteString(c.Text.Value)
			}
		}
		if b.Len() > 0 {
			return b.String(), nil
		}
	}
	return "", fmt.Errorf("no assistant text in thread")
}

func buildUserPrompt(documentType, expectedName string) string {
	var b strings.Builder
	b.WriteString("Тип документа: ")
	b.WriteString(documentType)
	if expectedName != "" {
		b.WriteString("\nОчікуване ім'я власника: ")
		b.WriteString(expectedName)
	}
	b.WriteString("\n\nПоверни рівно один JSON-об'єкт. Включи: is_valid (bool) або decision (\"match\"|\"no_match\"|\"unreadable\"); confidence (\"low\"|\"medium\"|\"high\" або 0..1); full_name з підполями surname та given_name (без по батькові, в оригіналі), або extracted_name; reason або notes (коротке пояснення).")
	return b.String()
}

func parseAssistantResponse(text string) *Result {
	clean := stripCodeFence(strings.TrimSpace(text))
	var raw map[string]any
	if err := json.Unmarshal([]byte(clean), &raw); err != nil {
		return &Result{
			Decision: "unreadable",
			Notes:    "could not parse assistant response: " + truncate(text, 200),
		}
	}

	res := &Result{}

	if d, ok := raw["decision"].(string); ok && d != "" {
		res.Decision = d
	} else if v, ok := raw["is_valid"].(bool); ok {
		if v {
			res.Decision = "match"
		} else {
			res.Decision = "no_match"
		}
	} else {
		res.Decision = "unreadable"
	}
	if res.Decision != "match" && res.Decision != "no_match" && res.Decision != "unreadable" {
		res.Decision = "unreadable"
	}

	switch c := raw["confidence"].(type) {
	case float64:
		res.Confidence = c
	case string:
		switch strings.ToLower(c) {
		case "high":
			res.Confidence = 0.95
		case "medium":
			res.Confidence = 0.75
		case "low":
			res.Confidence = 0.5
		}
	}
	if res.Confidence < 0 {
		res.Confidence = 0
	}
	if res.Confidence > 1 {
		res.Confidence = 1
	}

	if fn, ok := raw["full_name"].(map[string]any); ok {
		if s, ok := fn["surname"].(string); ok {
			res.Surname = strings.TrimSpace(s)
		}
		if g, ok := fn["given_name"].(string); ok {
			res.GivenName = strings.TrimSpace(g)
		}
		var parts []string
		if res.GivenName != "" {
			parts = append(parts, res.GivenName)
		}
		if res.Surname != "" {
			parts = append(parts, res.Surname)
		}
		res.ExtractedName = strings.Join(parts, " ")
	}
	if res.ExtractedName == "" {
		if en, ok := raw["extracted_name"].(string); ok {
			res.ExtractedName = strings.TrimSpace(en)
		}
	}

	if id, ok := raw["extracted_id"].(string); ok {
		res.ExtractedID = id
	}
	if notes, ok := raw["notes"].(string); ok && notes != "" {
		res.Notes = notes
	} else if reason, ok := raw["reason"].(string); ok {
		res.Notes = reason
	}
	return res
}

func stripCodeFence(s string) string {
	if !strings.HasPrefix(s, "```") {
		return s
	}
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	return strings.TrimSpace(s)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
