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

## Agent Rules

- Edit isolated files; avoid touching shared entry files (`app.js`, `app.routes.ts`)
  from multiple branches in parallel.
- Add new dependencies via the package manager (do not hand-edit `package.json` versions).
- Run lint/build/tests before proposing a merge.
