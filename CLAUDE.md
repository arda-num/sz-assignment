# Project rules

Full-stack calculator for a technical assignment: React + TypeScript frontend, Go backend.
The original assignment text is in `PROMPTS.md` (first prompt) and is the main reference.

## Workflow

- Plan first, code after approval. Work step by step; one PR per step, then stop for review.
- If something is ambiguous (product behaviour, UI, semantics), present options with a recommendation and ask. Do not decide alone.
- Never push to `main` directly (only the initial commit was pushed there). Never merge PRs — the owner reviews and merges.
- Small, meaningful conventional commits. For TDD, commit tests and implementation separately when it makes sense.
- PR description: short summary of what changed and how to test it.
- Review comments are fixed in the same PR.
- Append every prompt the user writes to `PROMPTS.md`, verbatim.

## Explaining Go

The owner does not know Go and must be able to explain every line in interviews.
When writing Go, explain the idioms and why they were chosen **in the chat**, not in code comments.

## Backend (Go)

- Idiomatic Go, not Java-style. Standard library only (`net/http`, `encoding/json`), no frameworks.
- Calculation logic lives in its own package, separate from HTTP. Handlers are thin.
- No interfaces or abstractions unless genuinely needed.
- TDD: write unit tests first, then implement. Test handlers with `httptest`.
- Handle edge cases: division by zero, sqrt of negatives, overflow/Inf/NaN, broken JSON, missing fields, unknown operations, oversized bodies.
- All errors use one JSON shape with the correct HTTP status: `{"error": {"code": "...", "message": "..."}}`.
- Error messages are owned by the HTTP layer; never return internal error text, Go type names or stack traces to clients.
- `gofmt` and `golangci-lint` must pass.

## Frontend (React)

- Vite + strict TypeScript. No calculation in the frontend — the backend does all math.
- One responsibility per component (Display, Keypad, Key, ErrorMessage, ...).
- State logic in custom hooks; API calls in a separate module, never inside components.
- Each component has its own CSS Module next to it (`Component.module.css`). Only a small global reset/theme file.
- Input validation, loading and error states, keyboard support, mobile-friendly.
- Tests with Vitest + React Testing Library; mock the API.
- ESLint + Prettier + `tsc --noEmit` must pass.

## Docker & CI

- Multi-stage Dockerfiles for frontend and backend.
- `docker compose` serves both; frontend on nginx, proxying `/api` to the backend.
- GitHub Actions: lint, tests and coverage reports for both sides.

## Code & docs

- No unnecessary comments; only comment non-obvious decisions.
- README stays concise: setup, run locally and with Docker, curl examples, design decisions/assumptions, tests & coverage.

## Agreed decisions

- API: single endpoint `POST /api/v1/calculate` with `{ "operation", "a", "b" }`; `b` omitted for unary ops.
- Operations: add, subtract, multiply, divide, power, sqrt, percent.
- Percent is unary: `x%` = `x / 100`.
- UI: classic keypad, immediate execution (each binary op is one API call; chaining evaluates left to right).
- Numbers are `float64`; the frontend only formats results for display.
- Keypad extras: backspace (⌫) only, no ± key. A single AC key clears everything (Escape).
- A second `=` after a result does nothing.
- After an error, the next key press starts fresh.
- Shell commands in docs/PR descriptions never contain inline `#` comments (they break in zsh).
