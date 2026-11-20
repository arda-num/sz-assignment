package httpapi_test

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/arda-num/sz-assignment/backend/internal/httpapi"
)

const calculatePath = "/api/v1/calculate"

type errorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

func serve(t *testing.T, method, path, contentType, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	httpapi.NewHandler(slog.New(slog.DiscardHandler)).ServeHTTP(rec, req)
	return rec
}

func postJSON(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	return serve(t, http.MethodPost, calculatePath, "application/json", body)
}

func assertJSONContentType(t *testing.T, rec *httptest.ResponseRecorder) {
	t.Helper()
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want %q", got, "application/json")
	}
}

func assertError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantCode string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, wantStatus, rec.Body)
	}
	assertJSONContentType(t, rec)

	var resp errorResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decoding error response: %v", err)
	}
	if resp.Error.Code != wantCode {
		t.Errorf("error code = %q, want %q", resp.Error.Code, wantCode)
	}
	if resp.Error.Message == "" {
		t.Error("error message is empty")
	}
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{name: "add", body: `{"operation":"add","a":2,"b":3}`, want: 5},
		{name: "subtract", body: `{"operation":"subtract","a":2,"b":3}`, want: -1},
		{name: "multiply", body: `{"operation":"multiply","a":2.5,"b":4}`, want: 10},
		{name: "divide", body: `{"operation":"divide","a":10,"b":4}`, want: 2.5},
		{name: "power", body: `{"operation":"power","a":2,"b":8}`, want: 256},
		{name: "sqrt", body: `{"operation":"sqrt","a":81}`, want: 9},
		{name: "percent", body: `{"operation":"percent","a":50}`, want: 0.5},
		{name: "zero operands are not missing", body: `{"operation":"add","a":0,"b":0}`, want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := postJSON(t, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
			}
			assertJSONContentType(t, rec)

			var resp struct {
				Result *float64 `json:"result"`
			}
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decoding response: %v", err)
			}
			if resp.Result == nil {
				t.Fatal("response has no result field")
			}
			if *resp.Result != tt.want {
				t.Errorf("result = %v, want %v", *resp.Result, tt.want)
			}
		})
	}
}

func TestCalculateAcceptsContentTypeWithCharset(t *testing.T) {
	rec := serve(t, http.MethodPost, calculatePath, "application/json; charset=utf-8", `{"operation":"add","a":1,"b":1}`)
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want %d (body: %s)", rec.Code, http.StatusOK, rec.Body)
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{name: "division by zero", body: `{"operation":"divide","a":1,"b":0}`, wantStatus: http.StatusUnprocessableEntity, wantCode: "division_by_zero"},
		{name: "sqrt of negative", body: `{"operation":"sqrt","a":-9}`, wantStatus: http.StatusUnprocessableEntity, wantCode: "invalid_domain"},
		{name: "result overflow", body: `{"operation":"multiply","a":1e308,"b":10}`, wantStatus: http.StatusUnprocessableEntity, wantCode: "result_out_of_range"},

		{name: "empty body", body: ``, wantStatus: http.StatusBadRequest, wantCode: "invalid_json"},
		{name: "broken json", body: `{"operation":"add",`, wantStatus: http.StatusBadRequest, wantCode: "invalid_json"},
		{name: "not an object", body: `[1,2]`, wantStatus: http.StatusBadRequest, wantCode: "invalid_json"},
		{name: "trailing data", body: `{"operation":"add","a":1,"b":2}{"x":1}`, wantStatus: http.StatusBadRequest, wantCode: "invalid_json"},
		{name: "number as string", body: `{"operation":"add","a":"1","b":2}`, wantStatus: http.StatusBadRequest, wantCode: "invalid_field"},
		{name: "operation as number", body: `{"operation":1,"a":1,"b":2}`, wantStatus: http.StatusBadRequest, wantCode: "invalid_field"},
		{name: "number out of float64 range", body: `{"operation":"add","a":1e400,"b":2}`, wantStatus: http.StatusBadRequest, wantCode: "invalid_field"},
		{name: "unknown field", body: `{"operation":"add","a":1,"b":2,"c":3}`, wantStatus: http.StatusBadRequest, wantCode: "unknown_field"},

		{name: "missing operation", body: `{"a":1,"b":2}`, wantStatus: http.StatusBadRequest, wantCode: "missing_field"},
		{name: "missing a", body: `{"operation":"add","b":2}`, wantStatus: http.StatusBadRequest, wantCode: "missing_field"},
		{name: "null a", body: `{"operation":"add","a":null,"b":2}`, wantStatus: http.StatusBadRequest, wantCode: "missing_field"},
		{name: "missing b for binary", body: `{"operation":"divide","a":1}`, wantStatus: http.StatusBadRequest, wantCode: "missing_field"},
		{name: "b for unary", body: `{"operation":"sqrt","a":4,"b":2}`, wantStatus: http.StatusBadRequest, wantCode: "unexpected_operand"},
		{name: "unknown operation", body: `{"operation":"modulo","a":1,"b":2}`, wantStatus: http.StatusBadRequest, wantCode: "unknown_operation"},

		{name: "body too large", body: `{"operation":"add",` + strings.Repeat(" ", 5000) + `"a":1,"b":2}`, wantStatus: http.StatusRequestEntityTooLarge, wantCode: "request_too_large"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assertError(t, postJSON(t, tt.body), tt.wantStatus, tt.wantCode)
		})
	}
}

func TestCalculateRejectsNonJSONContentType(t *testing.T) {
	body := `{"operation":"add","a":1,"b":2}`
	for _, contentType := range []string{"", "text/plain", "application/x-www-form-urlencoded"} {
		t.Run(contentType, func(t *testing.T) {
			rec := serve(t, http.MethodPost, calculatePath, contentType, body)
			assertError(t, rec, http.StatusUnsupportedMediaType, "unsupported_media_type")
		})
	}
}

func TestMethodNotAllowed(t *testing.T) {
	tests := []struct {
		method, path, wantAllow string
	}{
		{method: http.MethodGet, path: calculatePath, wantAllow: http.MethodPost},
		{method: http.MethodPut, path: calculatePath, wantAllow: http.MethodPost},
		{method: http.MethodPost, path: "/healthz", wantAllow: http.MethodGet},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			rec := serve(t, tt.method, tt.path, "", "")
			assertError(t, rec, http.StatusMethodNotAllowed, "method_not_allowed")
			if got := rec.Header().Get("Allow"); got != tt.wantAllow {
				t.Errorf("Allow = %q, want %q", got, tt.wantAllow)
			}
		})
	}
}

func TestNotFound(t *testing.T) {
	for _, path := range []string{"/", "/api/v1/unknown", "/api/v1/calculate/extra"} {
		t.Run(path, func(t *testing.T) {
			assertError(t, serve(t, http.MethodGet, path, "", ""), http.StatusNotFound, "not_found")
		})
	}
}

func TestHealth(t *testing.T) {
	rec := serve(t, http.MethodGet, "/healthz", "", "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
	assertJSONContentType(t, rec)
	if got, want := strings.TrimSpace(rec.Body.String()), `{"status":"ok"}`; got != want {
		t.Errorf("body = %s, want %s", got, want)
	}
}
