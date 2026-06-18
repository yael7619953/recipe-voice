# AGENTS.md

Guidance for AI agents and developers working in this repository.

## Project Overview

Recipe management platform with a **voice kitchen assistant**: recipes are organized
in hierarchical categories, cooking steps are read aloud (TTS) while the app listens
continuously for voice commands (STT), and recipes can be imported via AI from
PDF / image / live audio.

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Backend  | Node.js + Express 5 + Mongoose 9 + MongoDB (ES Modules) |
| Frontend | Angular 21 (standalone components) |
| Auth     | JWT + bcrypt + Google OAuth (passport) |
| i18n     | ngx-translate — Hebrew (RTL) + English (LTR) |
| AI/Voice | Whisper (STT) + Web Speech API (TTS) + LLM structured output |
| CI/CD    | GitHub Actions |

## Repository Layout

```text
server/                # Express API (MVC + services)
  app.js               # entry: middleware + mount routers (keep minimal)
  config/              # db.js, passport.js
  models/              # user, category, recipe (Mongoose, lowercase refs)
  controllers/         # thin: req/res only
  services/            # business logic, framework-agnostic
  routes/index.js      # router aggregator -> app.use('/api', routes)
  middleware/          # auth, error, upload, validate
client/src/app/        # Angular standalone app
  core/                # guards, interceptors, services, models
  features/            # lazy-loaded feature modules (auth, recipes, cooking, ...)
  shared/              # reusable components, pipes, directives
plans/                 # planning docs (no code)
```

## Setup & Commands

```bash
# Server (from server/)
npm install
npm run dev          # nodemon, http://localhost:5000

# Client (from client/)
npm install
npm start            # ng serve, http://localhost:4200
npm run build
npm test             # vitest
```

Copy `server/.env.example` to `server/.env`. Required vars: `MONGO_URI`, `JWT_SECRET`,
Google OAuth keys, and LLM keys. **Never commit secrets** — use `.env` / GitHub Secrets only.

## Conventions

- **Code comments: English only.** Write only comments that explain non-obvious intent.
- **Server**: ES Modules (`import`/`export`), `async/await`. Keep controllers thin;
  put logic in `services/`. Register every router via `routes/index.js`, never in `app.js`.
- **Client**: standalone components, lazy `loadChildren` per feature in `app.routes.ts`.
  Use logical CSS (`margin-inline`, `text-align: start`) for RTL/LTR support.
- **Security**: protect routes with `auth.middleware`; always filter data by `userId`.
- **Style**: Prettier (`printWidth: 100`, single quotes) on the client.

## Git & Commits

- Flow: `main` (stable) ← `develop` (integration) ← `feature/*` branches.
- Merge to `develop` only via PR with green CI; prefer squash merge.
- **Conventional Commits** — `type(scope): subject`, e.g.:
  - `feat(auth): add Google OAuth callback`
  - `fix(recipes): correct userId filter on list endpoint`
  - `chore(ci): add server test job`
- Common types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`.
- **Commit message style:** subject line uses present tense and describes *what* was added/changed. Optional body explains *why* or lists key details. Never include internal task numbers, milestone labels, or step counters — keep messages professional and self-contained.

## Agent Rules

- Edit isolated files; avoid touching shared entry files (`app.js`, `app.routes.ts`)
  from multiple branches in parallel.
- Add new dependencies via the package manager (do not hand-edit `package.json` versions).
- Run lint/build/tests before proposing a merge.
- **Server errors:** always `throw new AppError(message, statusCode)` — the `errorHandler` in
  `error.middleware.js` maps it to the correct HTTP response. Never throw a plain `Error` for
  expected HTTP errors (4xx).
- **New router:** export from its own `*.routes.js` and register in `routes/index.js`. Never
  add `app.use(...)` directly in `app.js`.
- **Uploads:** import from `upload.middleware.js` — use `uploadPdf`, `uploadImage`,
  `uploadAudio`, or `uploadMedia` as route-level middleware. Field name for audio uploads is
  `audio`; for all other file types it is `file`.
- **Client auth state:** `TokenStorageService` owns localStorage (token + user). `AuthService`
  wraps it with Angular signals. Never read `localStorage` for auth data outside these two
  services.
- **Shared branch `feature/ai-import`:** Shira owns `ai.service.js` / `ai.controller.js` /
  `ai.routes.js`; Yael owns `voice.service.js` / `voice.controller.js` / `voice.routes.js` +
  the import wizard in the client. Do not edit the other person's files on this branch.
- **CONTRACTS.md:** when adding or changing an endpoint, update the relevant section and
  append a row to the Changelog table at the bottom of the file.

## Lessons Learned

These are mistakes that were made and must not be repeated:

- **Read before edit:** always read a file with the Read tool before modifying it — never edit from memory or assumptions.
- **One entry point for routes:** never add `app.use(...)` in `app.js`; always register in `routes/index.js`. This was violated once and caused duplicate route registration.
- **No hand-editing package.json:** dependency versions must be added via `npm install <pkg>` — hand-editing caused a lockfile mismatch that broke CI.
- **Validate middleware placement:** `validate(schema)` must be placed *before* the controller in the route definition, never after.
- **Do not touch peer files on shared branches:** on `feature/ai-import`, Shira owns `ai.*` files and Yael owns `voice.*` files — crossing this boundary caused a merge conflict that required manual resolution.
