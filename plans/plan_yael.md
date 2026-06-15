# תוכנית עבודה אישית — YAEL (4 ימים)

מסמך תכנון בלבד. נגזר מתוך `recipe_project_plan.md`. אין כאן קוד או מימוש — רק מה לעשות בכל יום.

---

## TL;DR — יעל במבט אחד

| | |
| --- | --- |
| **מי אני** | תשתית שרת+לקוח · Google OAuth · Categories CRUD (שרת+UI) · `voice.service` בשרת (Whisper) — בלעדי · מצב בישול — `cooking.component` + TTS + טיימרים · AI Import wizard · חצי CI (server) |
| **ה-MERGE שלי** | M1 (יום 1, ~11:00) · M4 (יום 1, ~18:30) · M5 (יום 2, ~12:30) · M8 (יום 2, ~17:30) · M12 (יום 3, ~12:00) · M13 (יום 3, ~18:00) · M11 (יום 4, ~12:00) · M15 (יום 4, ~15:00) · M18 (יום 4, ~18:00) |
| **למי אני ממתינה (חוסם, אותו יום)** | M2 (Shira, יום 1) לפני M4 |
| **מי ממתין לי** | Shira: M2 (deps), M10 (upload), M14 · אני: M4, M12 |

---

## האחריות שלי (Yael) במבט-על

חלוקת העבודה בין Yael ל-Shira בנויה כך ששתינו נוגעות גם בשרת וגם בלקוח, וכל אחת מכסה פיצ'רים שונים — כדי שבסוף הפרויקט שתינו עברנו על כל החלקים. כל תלות בין-אישית מנוהלת דרך **לוח MERGE משותף** (ראו למטה) — אין תלות סמויה.

| צד | הפיצ'רים שלי |
| --- | --- |
| **Server** | תשתית הרצה (wiring של `app.js`, `routes/index.js`, error + upload middleware, התקנת תלות) · Google OAuth (passport) · Categories CRUD (כולל לוגיקת היררכיית `parentCategory`) · **`voice.service.js` (Whisper STT) + `voice.controller`/`voice.routes` — בלעדי** |
| **Client** | תשתית לקוח (ngx-translate base, providers) · ניהול Categories (UI עץ היררכי) · מצב בישול — **`cooking.component` + הקראת שלבים TTS + טיימרים ויזואליים** · AI Import **wizard** |
| **משותף** | חצי מ-CI (יחד עם Shira) |

> **בעלות קבצים — חשוב:** `server/services/voice.service.js` (Whisper STT) הוא **באחריותי הבלעדית** — Shira אינה נוגעת בו. Shira עובדת רק על `ai.service.js` + controllers/routes של AI. ב-`features/cooking/` אני בעלת **`cooking.component`, `cooking-tts.service` והטיימרים**; Shira מוסיפה את `cooking-stt.service` **רק אחרי MERGE M11** שלי.

> **בת הזוג שלי — Shira** — אחראית על: Auth ליבה (bcrypt+JWT, `auth.middleware`, `auth.routes` register/login), Recipes CRUD (שרת + UI), שכבת ה-AI/LLM בשרת (`ai.service` בלבד), מסכי Auth + interceptor/guard בלקוח, מצב בישול **`cooking-stt.service` (פקודות קוליות)**, ו-i18n/RTL.

---

## לוח MERGE משותף (זהה אצל שתינו)

טבלה אחת לשתינו. כל שורה היא נקודת מיזוג ל-`develop`.

**מקרא:**
- **תנאי (ממתינה ל-)** = MERGE שחייב להיות מוזג לפני שניתן למזג את השורה הזו.
- **מי ממתין לו** = מי תלוי בשורה הזו.
- **`⏸️`** = תלות **חוסמת באותו יום** — חייבים להמתין ל-MERGE לפני שמתחילים את החלק התלוי.
- מספרי ה-MERGE הם מזהים יציבים (לא בהכרח רציפים בזמן — `M10`/`M11` נעוצים ל-AI/Cooking).

| # | ענף | מי | מתי (יום+שעה) | תנאי (ממתינה ל-) | מי ממתין לו |
| --- | --- | --- | --- | --- | --- |
| **M1** | `feature/backend-infra` | Yael | יום 1, ~11:00 | אין — עצמאי | Shira (M2 deps, M10 upload), Yael (M4) |
| **M2** | `feature/auth-jwt-bcrypt` | Shira | יום 1, ~15:00 | M1 (deps) | Yael (M4, M5), Shira (M6) |
| **M3** | `feature/auth-jwt-bcrypt` | Shira | יום 1, ~18:00 | אין — עצמאי | Yael (M8), Shira (M7) |
| **M4** | `feature/auth-google-oauth` | Yael | יום 1, ~18:30 | ⏸️ **M2** (auth.routes register/login) | — |
| **M5** | `feature/categories-crud` | Yael | יום 2, ~12:30 | M2 (auth.middleware) | Yael (M12) |
| **M6** | `feature/recipes-crud` | Shira | יום 2, ~12:30 | M2 (auth.middleware) | Shira (M9) |
| **M7** | `feature/auth-jwt-bcrypt` | Shira | יום 2, ~17:30 | M3 (auth.service לקוח) | — |
| **M8** | `feature/auth-google-oauth` | Yael | יום 2, ~17:30 | M3 (auth.service לקוח) | — |
| **M9** | `feature/recipes-crud` | Shira | יום 3, ~12:00 | M6 (Recipes API) | — |
| **M12** | `feature/categories-crud` | Yael | יום 3, ~12:00 | M5 (Categories API) | — |
| **M10** | `feature/ai-import` | Shira | יום 3, ~18:00 | M1 (upload.middleware) | Yael (M15) |
| **M13** | `feature/ai-import` | Yael | יום 3, ~18:00 | M1 (upload.middleware) | Yael (M15, צריכת תמלול) |
| **M11** | `feature/step-timers` (+ cooking) | Yael | יום 4, ~12:00 | אין — עצמאי | Shira (M14) |
| **M14** | `feature/cooking-voice-commands` | Shira | יום 4, ~15:00 | ⏸️ **M11** (cooking.component + TTS) | — |
| **M15** | `feature/ai-import` | Yael | יום 4, ~15:00 | M10 (AI server) + M13 (voice) | — |
| **M16** | `feature/i18n-rtl` | Shira | יום 4, ~16:30 | אין — עצמאי | — |
| **M17** | `feature/ci-cd` | Shira | יום 4, ~18:00 | כל פיצ'רי הלקוח מוזגו | — |
| **M18** | `feature/ci-cd` | Yael | יום 4, ~18:00 | כל פיצ'רי השרת מוזגו | — |

**תלויות באותו יום (חוסמות — חייבות `⏸️ ממתינה ל-MERGE`):**
- M4 (Yael) ⏸️ ממתינה ל-M2 (Shira) ~15:00 — חלק ה-OAuth ב-`auth.routes` נכתב מעל register/login של Shira.
- M14 (Shira) ⏸️ ממתינה ל-M11 (Yael) ~12:00 — `cooking-stt.service` נכנס לתוך `cooking.component` שלי.

כל שאר התלויות הן בין-יומיות (ה-MERGE כבר מוזג ביום קודם) ולכן **אינן חוסמות** ומסומנות "כבר זמין".

> **בעלות הענף המשותף `feature/ai-import`:** שלושה מיזוגים יושבים על אותו ענף בבעלות שתינו — M10 (Shira), M13 (Yael), M15 (Yael). חלוקת קבצים מפורשת כדי שלא תהיה עריכה מקבילה לאותו קובץ: **Shira בעלת `ai.service.js` / `ai.controller.js` / `ai.routes.js`**; **Yael בעלת `voice.service.js` / `voice.controller.js` / `voice.routes.js` + ה-wizard בלקוח**. החיבור ביניהם דרך חוזה קלט/פלט מוסכם מראש (ראו יום 3).

---

## נקודות תיאום קבועות (כל יום)

- **בוקר (15 דק')**: סנכרון קצר — מי נוגע באילו קבצים היום + מה נמזג מאתמול (לפי לוח MERGE), כדי למנוע קונפליקטים ב-`app.js` / `app.routes.ts`.
- **כלל זהב**: לא נוגעות ישירות ב-`server/app.js` ו-`client/src/app/app.routes.ts` — כל פיצ'ר נרשם דרך `routes/index.js` (שרת) ו-`loadChildren` נפרד (לקוח). אני בעלת `routes/index.js` ו-wiring התשתית.
- **בעלות `auth.routes.js`**: Shira בעלת register/login (M2). אני מוסיפה את חלק ה-OAuth **רק אחרי MERGE M2** (M4) — עריכה עוקבת מעל הקובץ שלה, לא מקבילה.
- **סוף יום**: push לענף הפיצ'ר + פתיחת PR ל-`develop` כשהחלק עצמאי ועובר CI; עדכון שעת ה-MERGE בלוח המשותף.

---

## יום 1 — תשתית שרת+לקוח (Phase 0) + Google OAuth בשרת

**מטרת היום:** להעמיד סביבה עובדת לשתינו — היום הקריטי ביותר שלי כי Shira תלויה בתשתית שלי (M1).

### משימה A — תשתית שרת+לקוח + `upload.middleware`
- **ענף Git:** `feature/backend-infra`
- **⏸️ ממתינה ל:** אין — עצמאי (לסיים מוקדם ככל האפשר!).
- **MERGE שלי:** M1, ~11:00
- **⚠️ קריטי — לסיים מוקדם:** Shira ממתינה ל-M1 לפני M2, ויש לה רק ~4 שעות (M1 ~11:00 → M2 ~15:00) לכל ליבת ה-Auth בשרת. כל עיכוב ב-M1 דוחף את כל לוח היום של שתינו — זו המשימה בעדיפות עליונה בבוקר.
- תוכן: `npm install` לכל התלות החסרות (server: `jsonwebtoken`, `bcrypt`, `multer`, `passport`/Google OAuth, Voice/LLM; client: `@ngx-translate/core`, `@ngx-translate/http-loader`) · `server/.env.example` (`MONGO_URI`, `JWT_SECRET`, מפתחות Google ו-LLM) · `server/routes/index.js` (aggregator) · `error.middleware.js` · `upload.middleware.js` (multer ל-PDF/תמונה/אודיו) · חיבור ב-`app.js` (עריכה מבודדת) · תשתית לקוח: `app.config.ts` (`provideHttpClient` + `provideTranslate`), שלד `assets/i18n/he.json`+`en.json` ריקים, מבנה `core/` ו-`features/`.

### משימה B — Google OAuth (שרת)
- **ענף Git:** `feature/auth-google-oauth`
- **⏸️ ממתינה ל:** **M2** (Shira — `auth.routes` register/login), ~15:00 — באותו יום, לכן מוסיפה את חלק ה-OAuth ל-`auth.routes` רק אחרי MERGE M2.
- **MERGE שלי:** M4, ~18:30
- תוכן: `server/config/passport.js` (אסטרטגיית `passport-google-oauth20`) · הוספת `/api/auth/google` + callback (מנפיק JWT ומפנה ל-`oauth-callback`) ל-`auth.routes.js` — **חלק OAuth בלבד**, מעל register/login של Shira.

**Deliverable:** שרת+לקוח עולים; `routes/index`, error/upload middleware ו-`.env.example` מוכנים; זרימת Google OAuth בשרת קיימת.

---

## יום 2 — Categories API בשרת + oauth-callback בלקוח

### משימה A — Categories API (שרת, כולל לוגיקת היררכיה)
- **ענף Git:** `feature/categories-crud`
- **⏸️ ממתינה ל:** M2 (`auth.middleware`, מוזג יום 1) — כבר זמין, לא חוסם.
- **MERGE שלי:** M5, ~12:30
- תוכן: `server/services/category.service.js` (CRUD + לוגיקת `parentCategory` ובניית עץ) · `category.controller.js` + `category.routes.js` (מוגן ב-`auth.middleware`, סינון לפי `userId`).

### משימה B — oauth-callback + `category.service` (לקוח)
- **ענף Git:** `feature/auth-google-oauth`
- **⏸️ ממתינה ל:** M3 (Shira — `auth.service` בלקוח, מוזג יום 1) — כבר זמין.
- **MERGE שלי:** M8, ~17:30
- תוכן: `client/src/app/features/auth/oauth-callback` (קליטת JWT מה-redirect ושמירה דרך `auth.service` של Shira — לתאם שם מתודה/מפתח אחסון) · `core/services/category.service.ts` + `category.model.ts` (הכנה ל-UI של יום 3).

**Deliverable:** API קטגוריות היררכי מלא ומוגן + התחברות Google עובדת מקצה לקצה בלקוח.

---

## יום 3 — Categories UI בלקוח + `voice.service` בשרת

### משימה A — Categories UI (לקוח, עץ היררכי)
- **ענף Git:** `feature/categories-crud`
- **⏸️ ממתינה ל:** M5 (Categories API, מוזג יום 2) — כבר זמין.
- **MERGE שלי:** M12, ~12:00
- תוכן: `features/categories/` — תצוגת עץ היררכי, יצירה/עריכה/מחיקה, בחירת `parentCategory` · `features/categories/categories.routes.ts` + lazy ב-`app.routes.ts`.

### משימה B — `voice.service` בשרת (Whisper) — בלעדי לי
- **ענף Git:** `feature/ai-import`
- **⏸️ ממתינה ל:** M1 (`upload.middleware`, מוזג יום 1) — כבר זמין.
- **MERGE שלי:** M13, ~18:00
- תוכן: `server/services/voice.service.js` (תמלול אודיו עם Whisper `whisper-1`, תמיכה בעברית) · `voice.controller.js` + `routes/voice.routes.js`. **בעלות בלעדית** — Shira אינה נוגעת.
- **חוזה עם Shira (לא חוסם):** `voice.service` מחזיר טקסט שמוזן ל-`ai.service` של Shira (M10). לסכם פורמט קלט/פלט כך שה-wizard שלי (M15) יחבר את שני ה-endpoints ביום 4. הענף `feature/ai-import` משותף — לשמור על חלוקת קבצים (`voice.*` + wizard שלי, `ai.*` של Shira).

**Deliverable:** ניהול קטגוריות היררכי בלקוח + תמלול אודיו בשרת מוכן עבור צינור ה-AI.

---

## יום 4 — מצב בישול (TTS + טיימרים) + AI Import wizard + CI

### משימה A — מצב בישול: `cooking.component` + TTS + טיימרים
- **ענף Git:** `feature/step-timers` (+ שלד `features/cooking/`)
- **⏸️ ממתינה ל:** אין — עצמאי.
- **MERGE שלי:** M11, ~12:00
- תוכן: `features/cooking/cooking.component` (השלד והבעלות) · `cooking-tts.service` (הקראת שלבים, `speechSynthesis`, קול/שפה לפי שפת הממשק) · טיימרים ויזואליים לכל שלב עם `hasTimer: true`. אני **מגדירה את דגל ה-state "TTS מדבר"** ב-`cooking.component` כדי ש-Shira תוכל להשהות את ה-STT (מניעת echo). Shira מוסיפה `cooking-stt.service` **רק אחרי M11**.

### משימה B — AI Import wizard (לקוח)
- **ענף Git:** `feature/ai-import`
- **⏸️ ממתינה ל:** M10 (Shira — AI server, מוזג יום 3) — כבר זמין; משתמש גם ב-M13 (voice, מוזג יום 3).
- **MERGE שלי:** M15, ~15:00
- תוכן: `features/ai-import/` — wizard עם שלב העלאה: PDF / תמונה / **הקלטה קולית חיה** → שליחה ל-endpoints (voice לתמלול + ai לחילוץ) → תצוגה מקדימה לעריכה → שמירה דרך `recipe.service` · `features/ai-import/ai-import.routes.ts` + lazy ב-`app.routes.ts`.

### משימה C — CI (job server) + deploy
- **ענף Git:** `feature/ci-cd`
- **⏸️ ממתינה ל:** כל פיצ'רי השרת מוזגו ל-`develop`.
- **MERGE שלי:** M18, ~18:00
- תוכן: `.github/workflows/ci.yml` — job ה-**server** (ESLint + `npm ci` + Jest/Vitest + supertest + `mongodb-memory-server`); Shira על job ה-**client** (M17) · שלד `deploy.yml` (Render/Railway) + הזרקת secrets · מיזוג סופי ל-`develop`, בדיקת CI ירוק.

**Deliverable:** הקראת שלבים + טיימרים פעילים במצב בישול + wizard ל-AI Import עובד + CI server ירוק.

---

## סיכום תלויות שחשוב לי לזכור

1. **M1 (תשתית, יום 1) קריטית** — `routes/index`, `.env.example`, התקנת תלות, `upload.middleware` — Shira תלויה בכל אלה (M2 deps, M10 upload), ויש לה לו"ז הדוק (4 שעות עד M2). לסיים מוקדם ככל האפשר.
2. **M2 (`auth.middleware` של Shira, יום 1)** — אני צורכת אותו ב-Categories (M5) וממתינה לו ל-OAuth ב-`auth.routes` (M4, באותו יום).
3. **חוזה Voice→AI (יום 3)** — `voice.service` שלי (M13) מזין את `ai.service` של Shira (M10); `voice.service` בבעלותי הבלעדית. הענף `feature/ai-import` משותף — לשמור על חלוקת קבצים (`voice.*` + wizard שלי, `ai.*` של Shira).
4. **M11 (`cooking.component` שלי, יום 4)** — Shira ממתינה לו ל-`cooking-stt.service` (M14, באותו יום); להגדיר מראש את דגל "TTS מדבר" כדי למנוע echo.
