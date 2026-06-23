# API Contracts

Authoritative request/response contracts for the Recipe App REST API.
All routes are mounted under `/api` unless noted otherwise.

**Base URL (development):** `http://localhost:5000/api`

**Status:** Planned — derived from Mongoose models (`server/models/`) and project plans.
Update this file whenever an endpoint shape changes.

---

## Table of Contents

1. [Conventions](#1-conventions)
2. [Shared Types](#2-shared-types)
3. [Auth — `/auth`](#3-auth--auth)
4. [Categories — `/categories`](#4-categories--categories)
5. [Recipes — `/recipes`](#5-recipes--recipes)
6. [AI Import — `/ai`](#6-ai-import--ai)
7. [Voice — `/voice`](#7-voice--voice)
8. [Health Check](#8-health-check)

---

## 1. Conventions

### Authentication

Protected routes require a JWT in the `Authorization` header:

```http
Authorization: Bearer <token>
```

On success, `auth.middleware` sets `req.userId` (MongoDB ObjectId string).
Every query/mutation on user-owned resources **must** filter by `userId`.

| Route group | Auth required |
| ----------- | ------------- |
| `/auth/register`, `/auth/login`, `/auth/google*` | No |
| `/categories`, `/recipes`, `/ai`, `/voice` | Yes |
| `GET /` (root) | No |

### Content Types

| Use case | Content-Type |
| -------- | ------------ |
| JSON bodies | `application/json` |
| File upload (PDF, image, audio) | `multipart/form-data` |

### IDs and Dates

- Resource IDs are MongoDB ObjectIds returned as **24-character hex strings**.
- Timestamps are ISO 8601 strings in UTC (e.g. `"2026-06-15T10:30:00.000Z"`).

### HTTP Status Codes

| Code | Meaning |
| ---- | ------- |
| `200` | Success (GET, PUT, PATCH) |
| `201` | Created (POST) |
| `204` | Deleted (DELETE, no body) |
| `400` | Validation error / bad input |
| `401` | Missing or invalid JWT |
| `403` | Authenticated but not owner |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate email) |
| `413` | File too large |
| `415` | Unsupported media type |
| `422` | Unprocessable content (e.g. blank PDF / empty Word document) |
| `500` | Internal server error |
| `502` | Third-party service failure (OpenAI / Whisper) |
| `503` | Service not configured (e.g. missing API key) |

### Error Response Shape

All error responses use a consistent JSON body:

```json
{
  "success": false,
  "message": "Human-readable error summary",
  "errors": [
    { "field": "email", "message": "Email is already registered" }
  ]
}
```

- `errors` is optional; omit or use `[]` when not field-specific.

### Success Response Shape

- **Single resource:** return the resource object directly (no wrapper).
- **Collections:** return a JSON array.
- **Auth login/register:** return `{ token, user }`.
- **Voice utility endpoints:** return `{ ...payload }` as documented per endpoint.

---

## 2. Shared Types

Types below mirror `server/models/*.model.js`.

### User (public)

Password hash is **never** returned.

```typescript
interface User {
  _id: string;
  name: string;
  email: string;
  provider: 'local' | 'google';
  googleId: string | null;
  favorites: string[];       // recipe _id strings
  createdAt: string;         // ISO date
}
```

### Category

```typescript
interface Category {
  _id: string;
  name: string;
  color: string;             // e.g. "#FF5733"
  icon: string;              // icon key or URL
  userId: string;
  parentCategory: string | null;
}
```

### CategoryTreeNode

Same fields as `Category`, plus nested children (server-built tree):

```typescript
interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
```

### InstructionStep

```typescript
interface InstructionStep {
  text: string;
  timer: {
    duration: number;        // seconds; 0 when hasTimer is false
    hasTimer: boolean;
  };
}
```

### PrepTime

```typescript
interface PrepTime {
  hours: number;
  minutes: number;
}
```

### Recipe

```typescript
interface Recipe {
  _id: string;
  title: string;
  description?: string;
  ingredients: string[];
  instructions: InstructionStep[];
  categories: string[];      // category _id strings
  prepTime: PrepTime;
  servings?: string;
  notes?: string;
  isFavorite: boolean;
  userId: string;
  imageUrl?: string;
  createdAt: string;
}
```

### RecipeDraft (create / update payload)

Same as `Recipe` minus server-managed fields (`_id`, `userId`, `createdAt`).
Used as the body for `POST /recipes` and update endpoints.

```typescript
type RecipeDraft = Omit<Recipe, '_id' | 'userId' | 'createdAt'>;
```

### AuthTokenResponse

```typescript
interface AuthTokenResponse {
  token: string;             // JWT, expires per server config (e.g. 7d)
  user: User;
}
```

---

## 3. Auth — `/auth`

Owner: Shira (register/login) + Yael (Google OAuth).

### `POST /auth/register`

Create a local account.

**Request body:**

```json
{
  "name": "Yael Cohen",
  "email": "yael@example.com",
  "password": "securePass123"
}
```

| Field | Type | Rules |
| ----- | ---- | ----- |
| `name` | string | required, min 2 chars |
| `email` | string | required, valid email, unique |
| `password` | string | required, min 8 chars |

**Response `201`:** `AuthTokenResponse`

**Errors:** `400` validation, `409` email exists.

---

### `POST /auth/login`

**Request body:**

```json
{
  "email": "yael@example.com",
  "password": "securePass123"
}
```

**Response `200`:** `AuthTokenResponse`

**Errors:** `401` invalid credentials.

---

### `GET /auth/google`

Initiates Google OAuth (Passport redirect). No request body.

**Response:** `302` redirect to Google consent screen.

---

### `GET /auth/google/callback`

Google OAuth callback (handled by Passport).

**Response:** `302` redirect to the Angular client:

```text
{CLIENT_URL}/auth/oauth-callback?token=<JWT>
```

The client reads `token` from the query string and stores it via `auth.service`.

**Errors:** `401` if Google auth fails — redirect to `{CLIENT_URL}/auth/login?error=oauth_failed`.

---

### `GET /auth/me`

Returns the authenticated user's profile. Used by the client after OAuth to fetch name/email.

**Headers:** `Authorization: Bearer <token>` (required)

**Response `200`:**

```json
{
  "success": true,
  "user": {
    "id": "664a00000000000000000001",
    "name": "Yael Cohen",
    "email": "yael@example.com"
  }
}
```

**Errors:** `401` missing/invalid token, `404` user not found.

---

## 4. Categories — `/categories`

Owner: Yael. All routes require JWT.

### `GET /categories`

List categories for the authenticated user.

**Query parameters:**

| Param | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `tree` | boolean | `false` | When `true`, return nested `CategoryTreeNode[]`; otherwise flat `Category[]` |

**Response `200`:**

```json
[
  {
    "_id": "664a1b2c3d4e5f6789012345",
    "name": "Desserts",
    "color": "#E91E63",
    "icon": "cake",
    "userId": "664a00000000000000000001",
    "parentCategory": null,
    "children": []
  }
]
```

`children` is present only when `tree=true`.

---

### `GET /categories/:id`

**Response `200`:** `Category`

**Errors:** `404` not found, `403` not owner.

---

### `POST /categories`

**Request body:**

```json
{
  "name": "Cakes",
  "color": "#9C27B0",
  "icon": "birthday-cake",
  "parentCategory": "664a1b2c3d4e5f6789012345"
}
```

| Field | Type | Rules |
| ----- | ---- | ----- |
| `name` | string | required |
| `color` | string | required |
| `icon` | string | required |
| `parentCategory` | string \| null | optional; must belong to same user; no circular refs |

**Response `201`:** `Category`

---

### `PUT /categories/:id`

Full replace of mutable fields (`name`, `color`, `icon`, `parentCategory`).

**Request body:** same shape as POST (all fields required except `parentCategory` may be `null`).

**Response `200`:** `Category`

**Errors:** `400` circular parent, `404`, `403`.

---

### `DELETE /categories/:id`

**Response `204`:** no body.

**Errors:** `404`, `403`, `409` if category has children or linked recipes (implementation choice — document actual behavior when implemented).

---

## 5. Recipes — `/recipes`

Owner: Shira. All routes require JWT.

### `GET /recipes`

List recipes for the authenticated user.

**Query parameters:**

| Param | Type | Description |
| ----- | ---- | ----------- |
| `category` | string | Filter by category `_id`, including recipes assigned to descendant subcategories |
| `favorite` | boolean | When `true`, only favorites |
| `q` | string | Optional title search (case-insensitive) |
| `page` | number | Page number (default `1`, minimum `1`) |
| `limit` | number | Items per page (default `20`, maximum `20`) |

**Response `200`:**

```typescript
interface RecipeListResponse {
  items: Recipe[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

---

### `GET /recipes/:id`

**Response `200`:** `Recipe`

**Errors:** `404`, `403`.

---

### `POST /recipes`

**Request body:** `RecipeDraft`

```json
{
  "title": "Chocolate Cake",
  "description": "Rich and moist",
  "ingredients": ["2 cups flour", "1 cup sugar", "3 eggs"],
  "instructions": [
    {
      "text": "Preheat oven to 180°C",
      "timer": { "duration": 0, "hasTimer": false }
    },
    {
      "text": "Bake until a toothpick comes out clean",
      "timer": { "duration": 1800, "hasTimer": true }
    }
  ],
  "categories": ["664a1b2c3d4e5f6789012345"],
  "prepTime": { "hours": 0, "minutes": 45 },
  "servings": "8",
  "notes": "Best served warm",
  "isFavorite": false,
  "imageUrl": null
}
```

**Response `201`:** `Recipe` (includes `_id`, `userId`, `createdAt`)

---

### `PUT /recipes/:id`

Full replace. Same body as POST (`RecipeDraft`).

**Response `200`:** `Recipe`

---

### `PATCH /recipes/:id`

Partial update. Any subset of `RecipeDraft` fields.

**Response `200`:** `Recipe`

---

### `DELETE /recipes/:id`

**Response `204`:** no body.

---

## 6. AI Import — `/ai`

Owner: Shira (`ai.service.js`, `ai.controller.js`, `ai.routes.js`). All routes require JWT.

### `POST /ai/extract`

Extract a structured recipe from an uploaded file (PDF, image, or Word `.docx`).
The server reads the file, extracts its text (or uses Gemini Vision for images), calls
Gemini structured output with the recipe schema, and returns the parsed recipe preview.
The file is **not** saved to the database — the client wizard (Yael, M15) displays
the result for user review before saving via `POST /recipes`.

**Request:** `multipart/form-data`

| Field | Type | Rules |
| ----- | ---- | ----- |
| `file` | file | required; PDF / image (jpg, png, webp, …) / `.docx`; max size per `UPLOAD_MAX_FILE_SIZE` env var (default 25 MB) |

**Headers:** `Authorization: Bearer <token>` (required)

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "title": "Chocolate Cake",
    "description": "Rich and moist chocolate cake",
    "ingredients": ["2 cups flour", "1 cup sugar", "3 eggs"],
    "instructions": [
      {
        "text": "Preheat oven to 180°C",
        "timer": { "duration": 0, "hasTimer": false }
      },
      {
        "text": "Bake for 30 minutes",
        "timer": { "duration": 30, "hasTimer": true }
      }
    ],
    "prepTime": { "hours": 0, "minutes": 45 },
    "servings": "8",
    "notes": null
  }
}
```

The `data` object matches `RecipeDraft` (minus `categories`, `isFavorite`, `imageUrl` which
are not extracted from the file). Optional fields (`description`, `notes`) are `null` when
absent in the source document.

**Errors:**

| Code | Condition |
| ---- | --------- |
| `400` | No file uploaded |
| `415` | Unsupported file type |
| `422` | File content is blank / unreadable (empty PDF or Word document) |
| `502` | Gemini API call failed (network, quota, timeout) |
| `503` | `GEMINI_API_KEY` not configured on the server |

---

## 7. Voice — `/voice`

Owner: Yael (Whisper STT). All routes require JWT.

Used by **Cooking mode (fallback)** — classify a short voice command when browser STT is unavailable.

### `POST /voice/transcribe`

Transcribe an audio file to plain text (OpenAI Whisper `whisper-1`).

**Request:** `multipart/form-data`

| Field | Type | Rules |
| ----- | ---- | ----- |
| `audio` | file | required; `audio/*` (e.g. webm, mp3, wav, m4a); max size per `upload.middleware` |
| `language` | string | optional; BCP-47 hint, e.g. `"he"`, `"en"` |

**Response `200`:**

```json
{
  "text": "שתי כוסות קמח, שלוש ביצים, חצי כוס סוכר...",
  "language": "he",
  "durationSeconds": 42.5
}
```

| Field | Type | Description |
| ----- | ---- | ----------- |
| `text` | string | Full transcription |
| `language` | string | Detected or requested language |
| `durationSeconds` | number | Audio duration (optional metadata) |

**Errors:** `400` missing file, `413` too large, `415` unsupported format, `502` Whisper API failure.

---

### `POST /voice/command`

Classify a **short** audio clip as a cooking voice command (fallback for cooking mode).

**Request:** `multipart/form-data`

| Field | Type | Rules |
| ----- | ---- | ----- |
| `audio` | file | required; short clip (< 5 s recommended) |

**Response `200`:**

```json
{
  "command": "next"
}
```

**Allowed `command` values:**

| Value | Hebrew aliases (STT may produce) | Action |
| ----- | -------------------------------- | ------ |
| `stop` | עצור | Pause TTS |
| `continue` | המשך | Resume TTS |
| `previous` | קודם | Previous step |
| `next` | הבא | Next step |
| `unknown` | — | No recognized command |

**Errors:** same as `/voice/transcribe`.

> **Note:** Primary cooking STT runs in the browser (Web Speech API). This endpoint is the server fallback only.

---

## 8. Health Check

### `GET /`

Not under `/api`. Exists in `server/app.js`.

**Response `200`:** plain text

```text
Server is up and running with separate DB config!
```

Replace with a JSON health object when infra matures:

```json
{ "status": "ok", "timestamp": "2026-06-15T10:00:00.000Z" }
```

---

## Appendix: JWT Payload

Minimal claims (implementation in `server/utils/jwt.js`):

```json
{
  "userId": "664a00000000000000000001",
  "iat": 1718445600,
  "exp": 1719050400
}
```

---

## Changelog

| Date | Change |
| ---- | ------ |
| 2026-06-15 | Initial contract document (pre-implementation) |
| 2026-06-15 | Removed AI Import and Voice→AI pipeline sections |
| 2026-06-16 | Fix JWT payload — `email` claim was never signed; payload is `{ userId, iat, exp }` only |
| 2026-06-18 | `GET /recipes` — paginated list response (`page`, `limit`; default 20 per page) |
| 2026-06-21 | Add `GET /auth/me` — returns authenticated user profile for OAuth token bootstrap |
| 2026-06-21 | Add section 6 `POST /ai/extract` — AI recipe extraction from PDF / image / Word `.docx`; add status codes 422, 502, 503 |
| 2026-06-21 | AI import provider switched from OpenAI to Gemini (`GEMINI_API_KEY`); voice/STT still planned as Whisper |
| 2026-06-21 | `GET /recipes?category=` — includes recipes in descendant subcategories of the filtered category |
