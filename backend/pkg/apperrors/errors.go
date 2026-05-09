package apperrors

import "fmt"

type Code string

const (
	CodeValidation   Code = "validation_error"
	CodeUnauthorized Code = "unauthorized"
	CodeForbidden    Code = "forbidden"
	CodeNotFound     Code = "not_found"
	CodeConflict     Code = "conflict"
	CodeRateLimited  Code = "rate_limited"
	CodeInternal     Code = "internal_error"
)

type Error struct {
	Code    Code
	Status  int
	Message string
	Details map[string]any
}

func (e *Error) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func NewValidationError(msg string, details map[string]any) *Error {
	return &Error{Code: CodeValidation, Status: 400, Message: msg, Details: details}
}

func NewUnauthorizedError(msg string) *Error {
	return &Error{Code: CodeUnauthorized, Status: 401, Message: msg}
}

func NewForbiddenError(msg string) *Error {
	return &Error{Code: CodeForbidden, Status: 403, Message: msg}
}

func NewNotFoundError(msg string) *Error {
	return &Error{Code: CodeNotFound, Status: 404, Message: msg}
}

func NewConflictError(msg string) *Error {
	return &Error{Code: CodeConflict, Status: 409, Message: msg}
}

func NewRateLimitedError(msg string) *Error {
	return &Error{Code: CodeRateLimited, Status: 429, Message: msg}
}

func NewInternalError(msg string) *Error {
	return &Error{Code: CodeInternal, Status: 500, Message: msg}
}

func As(err error) (*Error, bool) {
	if e, ok := err.(*Error); ok {
		return e, true
	}
	return nil, false
}
