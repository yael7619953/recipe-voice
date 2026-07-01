# AGENTS.md — Server

Express 5 REST API (ES Modules). See root [`AGENTS.md`](../AGENTS.md) for monorepo context.

## Commands

```bash
cd server
npm install
npm run dev          # nodemon → http://localhost:5000
npm start            # node app.js
```

Verify the app boots before proposing a merge.

## Environment

Copy `.env.example` → `.env`. Required: `MONGO_URI`, `JWT_SECRET`, Google OAuth keys, LLM keys.
`config/db.js` falls back to `mongodb://localhost:27017/recipeDB` when `MONGO_URI` is unset.
**Never commit secrets** — use `.env` locally and GitHub Secrets in CI.

## Layout

```text
server/
  app.js               # middleware + mount routers only (keep minimal)
  config/              db.js, passport.js, loadEnv.js
  models/              user, category, recipe (lowercase refs)
  controllers/         thin req/res — wrap every handler with asyncHandler
  services/            business logic (framework-agnostic)
  routes/index.js      register all routers → app.use('/api', routes)
  middleware/          auth, error, upload, validate
  validators/          Joi schemas per domain
  utils/               asyncHandler, jwt, recipeSchema
```

Current API mounts: `/api/auth`, `/categories`, `/recipes`, `/ai` (+ `/health`).

## Patterns

### Controllers

```javascript
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../middleware/error.middleware.js';

export const listHandler = asyncHandler(async (req, res) => {
  const data = await recipeService.listByUser(req.userId, req.validatedQuery);
  res.json(data);
});
```

- **asyncHandler** on every controller export — no `try/catch` in controllers.
- Controllers delegate to services; no business logic in controllers.

### Services

- Throw `new AppError(message, statusCode)` for expected HTTP errors — never plain `Error`.
- `errorHandler` in `error.middleware.js` maps errors to JSON responses.

### Routes

```javascript
router.post('/', validateBody(createSchema), createHandler);  // validate BEFORE handler
router.post('/image', uploadImage, uploadImageHandler);       // upload as middleware
```

- Register new routers in `routes/index.js` — never mount directly in `app.js`.
- `authMiddleware` sets `req.userId`; always pass it into service calls.
- **userId filter:** every query returning user data must include `{ userId }`.

### Uploads

Import from `upload.middleware.js` — never call `multer()` directly:

| Export | Field name | Types |
| ------ | ---------- | ----- |
| `uploadPdf` | `file` | PDF |
| `uploadImage` | `file` | images |
| `uploadAudio` | `audio` | webm, mp3, wav, m4a |
| `uploadMedia` | `file` | pdf + image + audio |
| `uploadAiMedia` | `file` | pdf + image + docx |

## Conventions

- **ES Modules:** include `.js` extension in relative imports.
- **Mongoose:** model names and refs are lowercase (`'user'`, `'category'`, `'recipe'`). Index fields used in frequent queries.
- **Comments:** English only, non-obvious intent only.
- **API changes:** update `CONTRACTS.md` and append a Changelog row.

## Agent rules

- Avoid parallel edits to `app.js`.
- Add dependencies via `npm install` — do not hand-edit `package.json` versions.
- On branch `feature/ai-import`, Shira owns `ai.service.js` / `ai.controller.js` / `ai.routes.js`; Yael owns `voice.*` — do not cross boundaries.

## Pitfalls

- `validate(schema)` after the controller is a silent bug — always place it before.
- Reusing or re-creating multer instances breaks upload handling — use the shared exports.
- Missing `{ userId: req.userId }` in a DB filter is a security vulnerability.
- Mounting routes in both `app.js` and `routes/index.js` causes duplicate registration.
