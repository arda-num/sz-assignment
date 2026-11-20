package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"net/http"
	"strings"

	"github.com/arda-num/sz-assignment/backend/internal/calculator"
)

const (
	maxBodyBytes       = 4 << 10
	unknownFieldPrefix = "json: unknown field "
)

type calculateRequest struct {
	Operation calculator.Operation `json:"operation"`
	A         *float64             `json:"a"`
	B         *float64             `json:"b"`
}

type calculateResponse struct {
	Result float64 `json:"result"`
}

func handleCalculate(logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		req, apiErr := decodeCalculateRequest(w, r)
		if apiErr != nil {
			writeError(w, apiErr)
			return
		}
		if apiErr = validate(req); apiErr != nil {
			writeError(w, apiErr)
			return
		}

		var b float64
		if req.B != nil {
			b = *req.B
		}

		result, err := calculator.Calculate(req.Operation, *req.A, b)
		if err != nil {
			apiErr = calculationError(err)
			if apiErr.Status == http.StatusInternalServerError {
				logger.Error("unexpected calculation error", "error", err)
			}
			writeError(w, apiErr)
			return
		}

		writeJSON(w, http.StatusOK, calculateResponse{Result: result})
	}
}

func decodeCalculateRequest(w http.ResponseWriter, r *http.Request) (calculateRequest, *apiError) {
	var req calculateRequest

	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		return req, newAPIError(http.StatusUnsupportedMediaType, "unsupported_media_type",
			"Content-Type must be application/json")
	}

	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	if err := dec.Decode(&req); err != nil {
		return req, decodeError(err)
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return req, newAPIError(http.StatusBadRequest, "invalid_json",
			"request body must contain a single JSON object")
	}

	return req, nil
}

func decodeError(err error) *apiError {
	var maxBytesErr *http.MaxBytesError
	var typeErr *json.UnmarshalTypeError

	switch {
	case errors.As(err, &maxBytesErr):
		return newAPIError(http.StatusRequestEntityTooLarge, "request_too_large",
			fmt.Sprintf("request body must not exceed %d bytes", maxBytesErr.Limit))
	case errors.As(err, &typeErr) && typeErr.Field == "":
		return newAPIError(http.StatusBadRequest, "invalid_json", "request body must be a JSON object")
	case errors.As(err, &typeErr):
		return newAPIError(http.StatusBadRequest, "invalid_field",
			fmt.Sprintf("field %q must be %s", typeErr.Field, expectedType(typeErr.Field)))
	// encoding/json has no typed error for unknown fields; matching the message is the documented workaround.
	case strings.HasPrefix(err.Error(), unknownFieldPrefix):
		return newAPIError(http.StatusBadRequest, "unknown_field",
			"unknown field "+strings.TrimPrefix(err.Error(), unknownFieldPrefix))
	case errors.Is(err, io.EOF):
		return newAPIError(http.StatusBadRequest, "invalid_json", "request body is empty")
	default:
		return newAPIError(http.StatusBadRequest, "invalid_json", "request body is not valid JSON")
	}
}

func expectedType(field string) string {
	if field == "operation" {
		return "a string"
	}
	return "a finite number"
}

func validate(req calculateRequest) *apiError {
	if req.Operation == "" {
		return newAPIError(http.StatusBadRequest, "missing_field", `field "operation" is required`)
	}

	arity, ok := calculator.Arity(req.Operation)
	if !ok {
		return newAPIError(http.StatusBadRequest, "unknown_operation",
			fmt.Sprintf("unknown operation %q", req.Operation))
	}

	if req.A == nil {
		return newAPIError(http.StatusBadRequest, "missing_field", `field "a" is required`)
	}
	if arity == 2 && req.B == nil {
		return newAPIError(http.StatusBadRequest, "missing_field",
			fmt.Sprintf(`field "b" is required for operation %q`, req.Operation))
	}
	if arity == 1 && req.B != nil {
		return newAPIError(http.StatusBadRequest, "unexpected_operand",
			fmt.Sprintf(`operation %q takes a single operand, remove field "b"`, req.Operation))
	}

	return nil
}

func calculationError(err error) *apiError {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		return newAPIError(http.StatusUnprocessableEntity, "division_by_zero", "cannot divide by zero")
	case errors.Is(err, calculator.ErrInvalidDomain):
		return newAPIError(http.StatusUnprocessableEntity, "invalid_domain", "the result is not a real number")
	case errors.Is(err, calculator.ErrResultOutOfRange):
		return newAPIError(http.StatusUnprocessableEntity, "result_out_of_range", "the result is too large to represent")
	default:
		return internalError()
	}
}
