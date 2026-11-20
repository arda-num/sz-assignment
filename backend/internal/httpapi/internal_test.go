package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCalculationErrorHidesUnexpectedErrors(t *testing.T) {
	got := calculationError(errors.New("internal detail: stack overflow in module x"))

	want := apiError{Status: http.StatusInternalServerError, Code: "internal_error", Message: "internal server error"}
	if *got != want {
		t.Errorf("calculationError() = %+v, want %+v", *got, want)
	}
}

func TestRecoverPanicsReturnsJSONErrorAndLogs(t *testing.T) {
	var logs bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&logs, nil))
	handler := recoverPanics(logger, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("secret internal detail")
	}))

	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusInternalServerError)
	}
	if strings.Contains(rec.Body.String(), "secret") {
		t.Errorf("response leaks panic details: %s", rec.Body)
	}

	var resp struct {
		Error apiError `json:"error"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decoding response: %v", err)
	}
	if resp.Error.Code != "internal_error" || resp.Error.Message != "internal server error" {
		t.Errorf("error = %+v, want internal_error / internal server error", resp.Error)
	}
	if !strings.Contains(logs.String(), "secret internal detail") {
		t.Errorf("panic was not logged; logs: %s", logs.String())
	}
}

func TestRecoverPanicsLetsAbortHandlerPropagate(t *testing.T) {
	handler := recoverPanics(slog.New(slog.DiscardHandler), http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic(http.ErrAbortHandler)
	}))

	defer func() {
		err, _ := recover().(error)
		if !errors.Is(err, http.ErrAbortHandler) {
			t.Errorf("recovered %v, want http.ErrAbortHandler", err)
		}
	}()
	handler.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
}
