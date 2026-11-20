package httpapi

import (
	"encoding/json"
	"net/http"
)

type apiError struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func newAPIError(status int, code, message string) *apiError {
	return &apiError{Status: status, Code: code, Message: message}
}

func internalError() *apiError {
	return newAPIError(http.StatusInternalServerError, "internal_error", "internal server error")
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	// The status line is already sent, so an encoding failure can no longer be reported to the client.
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, e *apiError) {
	writeJSON(w, e.Status, struct {
		Error *apiError `json:"error"`
	}{Error: e})
}
