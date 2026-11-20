// Package httpapi exposes the calculator over HTTP with JSON requests and responses.
package httpapi

import (
	"log/slog"
	"net/http"
)

// NewHandler returns the root handler with all routes registered.
func NewHandler(logger *slog.Logger) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("POST /api/v1/calculate", handleCalculate(logger))
	mux.HandleFunc("GET /healthz", handleHealth)

	// Patterns without a method are less specific, so they only catch the remaining methods
	// and let us answer 405 in our JSON format instead of the mux's plain-text default.
	mux.HandleFunc("/api/v1/calculate", methodNotAllowed(http.MethodPost))
	mux.HandleFunc("/healthz", methodNotAllowed(http.MethodGet))
	mux.HandleFunc("/", handleNotFound)

	return logRequests(logger, recoverPanics(logger, mux))
}

func handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func handleNotFound(w http.ResponseWriter, _ *http.Request) {
	writeError(w, newAPIError(http.StatusNotFound, "not_found", "route not found"))
}

func methodNotAllowed(allowed string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Allow", allowed)
		writeError(w, newAPIError(http.StatusMethodNotAllowed, "method_not_allowed",
			r.Method+" is not allowed, use "+allowed))
	}
}
