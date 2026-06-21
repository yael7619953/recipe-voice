# AGENTS.md — Client

Guidance for AI agents and developers working in the **Angular app** (`client/`).
See the root `AGENTS.md` for project-wide context.

## Overview

Angular 21 single-page app for the recipe platform: browse hierarchical categories,
cook with the voice kitchen assistant (TTS read-aloud + STT commands), and import
recipes via AI. Bilingual: Hebrew (RTL) + English (LTR).

## Tech Stack

| Concern   | Technology |
| --------- | ---------- |
| Framework | Angular 21 (standalone components) |
| Routing   | `@angular/router` (lazy `loadChildren`) |
| Reactive  | RxJS 7 |
| i18n      | ngx-translate — Hebrew (RTL) + English (LTR) |
| Voice     | Web Speech API (TTS) + Whisper (STT) |
| Tests     | Vitest (+ jsdom) |
| Lang      | TypeScript 5.9 |

## Layout

```text
client/src/app/
  app.ts               # root standalone component
  app.config.ts        # application providers (router, etc.)
  app.routes.ts        # top-level routes (lazy loadChildren per feature)
  core/                # guards, interceptors, services, models
  features/            # lazy-loaded feature areas (auth, recipes, cooking, ...)
  shared/              # reusable components, pipes, directives
```

## Commands

```bash
# from client/
npm install
npm start            # ng serve, http://localhost:4200
npm run build        # ng build
npm test             # vitest
```

## Conventions

- **Standalone components** only (no NgModules). Register app-wide providers in
  `app.config.ts`.
- **Lazy load** every feature via `loadChildren` in `app.routes.ts`.
- **RTL/LTR support**: use logical CSS (`margin-inline`, `padding-inline`,
  `text-align: start/end`) instead of physical `left`/`right` properties.
- **i18n**: route all user-facing strings through ngx-translate; no hardcoded text.
- **Style**: Prettier with `printWidth: 100` and `singleQuote: true` (configured in
  `package.json`); HTML uses the `angular` parser.
- **Code comments: English only**, and only for non-obvious intent.

## Agent Rules

- Avoid editing the shared entry files `app.routes.ts` / `app.config.ts` from multiple
  branches in parallel.
- Add dependencies via `npm install` — do not hand-edit `package.json` versions.
- Run `npm run build` and `npm test` before proposing a merge.
