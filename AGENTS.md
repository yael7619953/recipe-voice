# AGENTS.md

Guide for AI agents and developers in this monorepo.

## Scoped guides

| Path | When to read |
| ---- | ------------ |
| [`client/AGENTS.md`](client/AGENTS.md) | Angular UI, i18n, voice/cooking client |
| [`server/AGENTS.md`](server/AGENTS.md) | Express API, Mongoose, uploads, auth |
| [`CONTRACTS.md`](CONTRACTS.md) | REST endpoint shapes and changelog |

## Quick start

```bash
# Server — http://localhost:5000
cd server && npm install && npm run dev

# Client — http://localhost:4200
cd client && npm install && npm start
```

Copy `server/.env.example` → `server/.env`. Required: `MONGO_URI`, `JWT_SECRET`, Google OAuth keys, and the key for the active LLM (`GEMINI_API_KEY` and/or `GROQ_API_KEY`; switch with `AI_PROVIDER`). **Never commit secrets.**

## Project

Recipe platform with hierarchical categories, a **voice kitchen assistant** (TTS read-aloud + STT commands), and **AI recipe import** from PDF / image / audio.

| Layer | Stack |
| ----- | ----- |
| Server | Node.js ES Modules, Express 5, Mongoose 9, MongoDB |
| Client | Angular 21 standalone, ngx-translate (Hebrew RTL + English LTR) |
| Auth | JWT + bcrypt + Google OAuth |
| AI/Voice | Whisper (STT), Web Speech API (TTS), LLM via `AI_PROVIDER` (`gemini` \| `groq`) |

## Layout

```text
server/           Express API (MVC + services) — see server/AGENTS.md
client/src/app/   Angular app — see client/AGENTS.md
CONTRACTS.md      API contract + changelog
plans/            Planning docs (no code)
```

## Cross-cutting rules

- **Security:** protect routes with `auth.middleware`; set `req.userId` from JWT. Every user-owned query must filter by `{ userId: req.userId }`.
- **Dependencies:** add via `npm install` — never hand-edit version fields in `package.json`.
- **Shared entry files:** avoid parallel edits to `server/app.js`, `client/src/app/app.routes.ts`, `client/src/app/app.config.ts`.
- **Comments:** English only; explain non-obvious intent.
- **API changes:** update `CONTRACTS.md` and append a row to its Changelog table.

## Git

- Flow: `main` ← `develop` ← `feature/*`; merge to `develop` via PR with green CI (squash preferred).
- **Conventional Commits:** `type(scope): subject` — e.g. `feat(auth): add Google OAuth callback`.
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `style`.
- Subject: present tense, describes *what* changed; optional body explains *why*. No internal task IDs or step counters.

## Team boundaries (`feature/ai-import`)

| Owner | Files |
| ----- | ----- |
| Shira | `server/services/ai.service.js`, `ai.controller.js`, `ai.routes.js` |
| Yael | `server/services/voice.service.js`, `voice.controller.js`, `voice.routes.js`, client `features/ai-import/` |

Do not edit the other owner's files on this branch.

## Pitfalls

- Read a file before editing — never edit from memory.
- Register routers only in `server/routes/index.js`, never in `app.js`.
- Controllers: wrap with `asyncHandler`; services: throw `AppError`, not plain `Error`.
- Uploads: use exports from `upload.middleware.js` — never instantiate `multer()` directly.
- Validation middleware must come **before** the controller in route definitions.
- Client auth state: only `TokenStorageService` and `AuthService` touch `localStorage`.
