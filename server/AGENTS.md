# AGENTS.md — Server

Guidance for AI agents and developers working in the **Express API** (`server/`).
See the root `AGENTS.md` for project-wide context.

## Overview

REST API for the recipe platform: authentication, recipe/category CRUD, and the
AI import + voice-assistant endpoints. Written in **ES Modules** with `async/await`.

## Tech Stack

| Concern  | Technology |
| -------- | ---------- |
| Runtime  | Node.js (ES Modules, `"type": "module"`) |
| Web      | Express 5 |
| Database | MongoDB via Mongoose 9 |
| Auth     | JWT + bcrypt + Google OAuth (passport) |
| Config   | dotenv |
| CORS     | cors |
| Dev      | nodemon |

## Layout

```text
server/
  app.js               # entry: middleware + mount routers (keep minimal)
  config/              # db.js (Mongoose connection), passport.js
  models/              # user, category, recipe (Mongoose, lowercase model names/refs)
  controllers/         # thin: req/res handling only
  services/            # business logic, framework-agnostic
  routes/index.js      # router aggregator -> app.use('/api', routes)
  middleware/          # auth, error, upload, validate
```

## Commands

```bash
# from server/
npm install
npm run dev          # nodemon, http://localhost:5000
npm start            # node app.js
```

## Environment

Copy `server/.env.example` to `server/.env`. Required vars:
`MONGO_URI`, `JWT_SECRET`, Google OAuth keys, and LLM keys.
`config/db.js` falls back to `mongodb://localhost:27017/recipeDB` when `MONGO_URI`
is unset. **Never commit secrets** — use `.env` / GitHub Secrets only.

## Conventions

- **ES Modules** (`import`/`export`) and `async/await` everywhere; include the `.js`
  extension in relative imports (e.g. `import connectDB from './config/db.js'`).
- **Thin controllers**: controllers only handle `req`/`res`; put all logic in `services/`.
- **Register routers via `routes/index.js`**, never directly in `app.js`. Keep `app.js`
  limited to middleware setup and `app.listen`.
- **Mongoose**: model names and refs are **lowercase** (`'user'`, `'category'`,
  `'recipe'`). Add indexes for fields used in frequent queries.
- **Security**: protect routes with `auth.middleware`; **always filter data by `userId`**
  so users only access their own recipes/categories.
- **Code comments: English only**, and only for non-obvious intent.

## Agent Rules

- Avoid editing the shared entry file `app.js` from multiple branches in parallel.
- Add dependencies via `npm install` — do not hand-edit `package.json` versions.
- Run the app (`npm run dev`) to verify it boots before proposing a merge.
