# Prompts

Every prompt I wrote while building this project, in order. AI tool: Claude Code (Claude Opus).

## 1. Project brief and working rules

```
I'm doing a technical assignment for a company. a full-stack calculator app with a React TS frontend and a Go backend. The original assignment is below, follow it as the main reference.

<assignment>
Objective
Build a full-stack calculator application with a React frontend and a backend microservice. The frontend should consume the backend API to perform basic and advanced arithmetic operations. Focus on clean design, maintainable code, and testable architecture.Requirements
Functional
Operations:

* Addition, Subtraction, Multiplication, Division
* Optional: Exponentiation, Square Root, Percentage

Frontend (React):

* Intuitive UI for entering input and displaying results
* Input validation and error handling
* Responsive design (basic mobile support)

Backend (REST API):

* Expose endpoints for calculator operations
* Validate input and handle edge cases (division by zero, invalid data)
* Return results in JSON format

Non-Functional

* Clean, readable, and idiomatic code (frontend and backend)
* Unit tests covering key functionality for both layers
* Documentation: setup instructions, API usage, and design rationale
* Optional: Dockerfile for full-stack deployment

Constraints

* Frontend: React (TypeScript preferred)
* Backend: Go is perferred

Deliverables

1. Git repository with frontend and backend code
2. README with setup instructions, API examples, and design decisions
3. Unit tests and coverage report
4. Optional: Dockerfile to run frontend + backend together

Instructions

1. Use any AI tooling you would like
2. Spend ~2–4 hours on this assignment. Prioritize correctness, clarity, and maintainability over extra features.
3. Push your solution to GitHub, GitLab, or another Git repository.
4. Share the repository link with us for evaluation.
5. Share any prompts that you used in your work
6. Make sure your README includes:
   * Setup instructions
   * How to run the frontend and backend
   * Examples of API calls (if using REST)
   * Design decisions or assumptions


</assignment>

Important: I don't know Go. I need to understand every line because I might be asked about it in the following interviews. So when you write Go code, briefly explain the idioms and why you chose them. Explain in the chat, not in code comments.

How we'll work:
* First, only give me a plan: architecture, API design, error format, folder structure and the steps. Don't write code before I approve it.
* Go step by step. After each step, open the PR and stop so I can review it.
* If something in the assignment is unclear (like what percentage means, or how the UI should work), give me options with your suggestion and ask me. Don't decide by yourself.
* After I approve the plan, push a small initial commit to main with .gitignore, a README skeleton, CLAUDE.md (with these rules) and PROMPTS.md, so we have a base for PRs.

Backend:
* Write idiomatic Go, not Java-style Go. Use only the standard library (net/http, encoding/json), no frameworks.
* Keep it simple. Calculation logic should be in its own package, separate from HTTP. Handlers should be thin. Don't add interfaces or abstractions unless we really need them.
* Follow test driven development. Write unit tests first for every new thing, then implement it. Test handlers with httptest.
* Handle edge cases: division by zero, square root of negative numbers, overflow/Inf/NaN, broken JSON, missing fields, unknown operations, very large request bodies.
* Errors should always return the same JSON format with the correct HTTP status code.
* Use gofmt and golangci-lint.

Frontend:
* Vite + strict TypeScript. Don't do any calculation in the frontend, the backend does all of it.
* Each component should do only one thing, like Display, Keypad, Key, ErrorMessage. State logic should be in a custom hook, API calls in a separate file, not inside components.
* Every component should have its own CSS Module file next to it (Component.module.css). Don't manage styles from one global file, only a small reset/theme file is ok.
* Input validation, loading and error states, keyboard support, and it should work on mobile.
* Write tests with Vitest + React Testing Library, mock the API.
* Use ESLint + Prettier and tsc --noEmit.

Docker & CI:
* Dockerize both frontend and backend (multi-stage builds).
* Use docker compose to serve both. Frontend runs on nginx and forwards /api to the backend.
* Put lint, tests and coverage reports for both sides in GitHub Actions CI.

Code & docs:
* Do not put unnecessary comments in the code. Only add one if there's a decision that needs to be known.
* Keep the README concise and clean: setup, how to run locally and with Docker, curl examples for the API, design decisions and assumptions, how to run tests and coverage.

Put every prompt I have written into a PROMPTS.md file. 

Git & GitHub:
* I've created a GitHub repository for this project: https://github.com/arda-num/sz-assignment
* First, push a small initial commit to main (.gitignore and a README skeleton) so we have a base for PRs.
* After that, never push directly to main. Open a separate pull request for each step, with a short description of what changed and how to test it.
* Use small, meaningful commits inside each PR (conventional commits). For TDD, commit the tests and the implementation separately when it makes sense.
* Do not merge anything. I'll review every PR and merge it myself.
* When I leave review comments, fix them in the same PR.
```

## 2. Answers to the plan's open questions

```
For open questions:
Q1: lets go with A. no need to make it complicated in backend. 
Q2: Yes lets go with A again
Q3: go with A, with the second design, I blieve it would be hard to support unary operations. 
Q4: all three
```

## 3. Approve PR 1, start PR 2

```
PR 1 looks good. start PR2. you can merge PR1
```

## 4. Approve PR 2, start the frontend scaffold

```
PR2 LGTM. Tested the endpoints.  start the frontend scaffold
```

## 5. Dev server error report

```
lets stop here for now. I am getting an error while I am trying to build the web app. can you have a look?

> calculator-frontend@0.0.0 dev
> vite # with the backend running on :8080, /api is proxied

CACError: Unused args: `with`, `the`, `backend`, `running`, `on`, `:8080,`, `/api`, `is`, `proxied`
(stack trace omitted)
```

## 6. Merge PR 2 and PR 3, start PR 4

```
ok great. The frontend foundations look OK to me. lets continue. you can merge PR2 and PR 3. Start PR 4.
```

Answers to the keypad questions: only ⌫ backspace (no ±), a single AC key, a second `=` does nothing, and the next key starts fresh after an error.

## 7. PR 4 review

```
I left a comment in the PR4. OTT look great. please address the comment and come again for review
```

Review comment on `frontend/src/hooks/calculatorState.ts`:

```
this file is not a hook, please move it to another folder named like `state` instead of hooks. also move the test.
```

## 8. Merge PR 4, design artifact before PR 5

```
ok perfect. now merge PR4 but before we start PR 5. I want you to create me a claude artifact for the UI design you are gonna make. after my approval of the design, we will write the code
```

## 9. Design approved, start PR 5

```
ok great.  I approve the design, now lets start the implementation
```

## 10. Merge PR 5, recap before PR 6

```
good good. I have made exhaustive tests in the frontend, could not find any problem. Both keyboard and click flows works fine. Now I want you to start PR 6 after merging PR 5. Before we start, remind me what was our plan so that I can verify we are on the same page
```

## 11. Docker decisions

```
1- A
2- A, no need
3- Yes lets put a docker image build checks in CI, Picking A
```
