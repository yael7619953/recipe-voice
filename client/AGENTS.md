# AGENTS.md — Client

Angular 21 SPA for the recipe platform. See root [`AGENTS.md`](../AGENTS.md) for monorepo context.

## Commands

```bash
cd client
npm install
npm start            # ng serve → http://localhost:4200
npm run build
npm test             # vitest
```

Run `build` and `test` before proposing a merge.

## Features

| Route | Area |
| ----- | ---- |
| `auth/` | Login, register, Google OAuth callback |
| `recipes/` | CRUD, detail, image upload |
| `categories/` | Hierarchical tree + forms |
| `cooking/` | Voice kitchen assistant (TTS + STT) |
| `ai-import/` | AI import wizard (PDF / image / audio) |

All authenticated routes use `authGuard` in `app.routes.ts`.

## Layout

```text
client/src/app/
  app.ts / app.config.ts / app.routes.ts   # entry (avoid parallel edits)
  core/
    guards/          auth, guest, logout
    interceptors/    jwt.interceptor
    services/        auth, recipe, category, ai-import, language, token-storage
    models/          shared TypeScript interfaces
  features/          lazy-loaded per route (see table above)
  shared/            reusable components, pipes, directives

client/public/i18n/  en.json, he.json — all user-facing strings
```

## Conventions

- **Standalone components only** — no NgModules. App-wide providers in `app.config.ts`.
- **Lazy load** every feature via `loadChildren` in `app.routes.ts`.
- **i18n:** all user-facing text through ngx-translate; add keys to both `en.json` and `he.json`.
- **RTL/LTR:** logical CSS (`margin-inline`, `padding-inline`, `text-align: start/end`) — not `left`/`right`.
- **HTTP:** `jwt.interceptor` attaches the token; domain API calls live in `core/services/`.
- **Auth state:** `TokenStorageService` owns `localStorage` (token + user). `AuthService` wraps it with signals. Never read auth data from `localStorage` elsewhere.
- **Prettier:** `printWidth: 100`, `singleQuote: true`; HTML uses the `angular` parser.
- **Comments:** English only, non-obvious intent only.

## Agent rules

- Avoid parallel edits to `app.routes.ts` and `app.config.ts`.
- Add dependencies via `npm install` — do not hand-edit `package.json` versions.
- On branch `feature/ai-import`, Yael owns `features/ai-import/` — do not cross into Shira's server `ai.*` files.

## Pitfalls

- Hardcoded UI strings break i18n — always use the translate pipe or service.
- Physical `margin-left` / `text-align: left` break Hebrew RTL layout.
- Do not bypass `AuthService`/`TokenStorageService` for session reads or writes.
