package http_handler

import (
	"regexp"

	validation "github.com/go-ozzo/ozzo-validation/v4"
)

var phonePattern = regexp.MustCompile(`^\+[1-9]\d{7,14}$`)

var PhoneRule = validation.Match(phonePattern).Error("invalid phone format (E.164)")
