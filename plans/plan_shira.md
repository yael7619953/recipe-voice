# תוכנית עבודה אישית — SHIRA (4 ימים)

מסמך תכנון בלבד. נגזר מתוך `recipe_project_plan.md`. אין כאן קוד או מימוש — רק מה לעשות בכל יום.

---

## TL;DR — שירה במבט אחד


|                                     |                                                                                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **מי אני**                          | Auth ליבה (שרת+לקוח) · Recipes CRUD (שרת+לקוח) · שכבת AI בשרת (`ai.service` בלבד) · מצב בישול — `cooking-stt.service` בלבד · i18n/RTL · חצי CI (client)                                        |
| **ה-MERGE שלי**                     | M2 (יום 1, ~15:00) · M3 (יום 1, ~18:00) · M6 (יום 2, ~12:30) · M7 (יום 2, ~17:30) · M9 (יום 3, ~12:00) · M10 (יום 3, ~18:00) · M14 (יום 4, ~15:00) · M16 (יום 4, ~16:30) · M17 (יום 4, ~18:00) |
| **למי אני ממתינה (חוסם, אותו יום)** | M1 (Yael, יום 1) לפני M2 · M11 (Yael, יום 4) לפני M14                                                                                                                                          |
| **מי ממתין לי**                     | Yael: M4, M5, M8, M15 · אני: M6, M7, M9, M14                                                                                                                                                   |


---

## האחריות שלי (Shira) במבט-על

חלוקת העבודה בין Shira ל-Yael בנויה כך ששתינו נוגעות גם בשרת וגם בלקוח, וכל אחת מכסה פיצ'רים שונים — כדי שבסוף הפרויקט שתינו עברנו על כל החלקים. כל תלות בין-אישית מנוהלת דרך **לוח MERGE משותף** (ראו למטה) — אין תלות סמויה.


| צד         | הפיצ'רים שלי                                                                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Server** | Auth ליבה (bcrypt + JWT, `auth.middleware`, `auth.routes` register/login) · Recipes CRUD · שכבת ה-AI/LLM בשרת — `**ai.service.js` בלבד** + controllers/routes של AI (Structured Output מטקסט/PDF/תמונה) |
| **Client** | מסכי Auth + `jwt.interceptor` + `auth.guard` · פיצ'ר Recipes (list/detail/form) · מצב בישול — `**cooking-stt.service` בלבד** (האזנה רציפה לפקודות STT) · i18n + RTL/LTR                                 |
| **משותף**  | חצי מ-CI (יחד עם Yael)                                                                                                                                                                                  |


> **בעלות קבצים — חשוב:** `server/services/voice.service.js` (Whisper STT בשרת) **אינו באחריותי** — הבעלים הבלעדי הוא **Yael**. אני עובדת רק על `ai.service.js` + `ai.controller.js`/`ai.routes.js`. ב-`features/cooking/` אני בעלת `**cooking-stt.service` בלבד** — את `cooking.component`, `cooking-tts.service` והטיימרים מנהלת Yael.

> **בת הזוג שלי — Yael** — אחראית על: תשתית שרת+לקוח, Google OAuth, Categories CRUD (שרת + UI), `**voice.service.js` בשרת (Whisper STT) — בלעדי**, מצב בישול `**cooking.component` + TTS + טיימרים ויזואליים**, ו-AI Import wizard בלקוח.

---

## לוח MERGE משותף (זהה אצל שתינו)

טבלה אחת לשתינו. כל שורה היא נקודת מיזוג ל-`develop`.

**מקרא:**

- **תנאי (ממתינה ל-)** = MERGE שחייב להיות מוזג לפני שניתן למזג את השורה הזו.
- **מי ממתין לו** = מי תלוי בשורה הזו.
- `**⏸️`** = תלות **חוסמת באותו יום** — חייבים להמתין ל-MERGE לפני שמתחילים את החלק התלוי.
- מספרי ה-MERGE הם מזהים יציבים (לא בהכרח רציפים בזמן — `M10`/`M11` נעוצים ל-AI/Cooking).


| #       | ענף                               | מי    | מתי (יום+שעה) | תנאי (ממתינה ל-)                       | מי ממתין לו                            |
| ------- | --------------------------------- | ----- | ------------- | -------------------------------------- | -------------------------------------- |
| **M1**  | `feature/backend-infra`           | Yael  | יום 1, ~11:00 | אין — עצמאי                            | Shira (M2 deps, M10 upload), Yael (M4) |
| **M2**  | `feature/auth-jwt-bcrypt`         | Shira | יום 1, ~15:00 | M1 (deps)                              | Yael (M4, M5), Shira (M6)              |
| **M3**  | `feature/auth-jwt-bcrypt`         | Shira | יום 1, ~18:00 | אין — עצמאי                            | Yael (M8), Shira (M7)                  |
| **M4**  | `feature/auth-google-oauth`       | Yael  | יום 1, ~18:30 | ⏸️ **M2** (auth.routes register/login) | —                                      |
| **M5**  | `feature/categories-crud`         | Yael  | יום 2, ~12:30 | M2 (auth.middleware)                   | Yael (M12)                             |
| **M6**  | `feature/recipes-crud`            | Shira | יום 2, ~12:30 | M2 (auth.middleware)                   | Shira (M9)                             |
| **M7**  | `feature/auth-jwt-bcrypt`         | Shira | יום 2, ~17:30 | M3 (auth.service לקוח)                 | —                                      |
| **M8**  | `feature/auth-google-oauth`       | Yael  | יום 2, ~17:30 | M3 (auth.service לקוח)                 | —                                      |
| **M9**  | `feature/recipes-crud`            | Shira | יום 3, ~12:00 | M6 (Recipes API)                       | —                                      |
| **M12** | `feature/categories-crud`         | Yael  | יום 3, ~12:00 | M5 (Categories API)                    | —                                      |
| **M10** | `feature/ai-import`               | Shira | יום 3, ~18:00 | M1 (upload.middleware)                 | Yael (M15)                             |
| **M13** | `feature/ai-import`               | Yael  | יום 3, ~18:00 | M1 (upload.middleware)                 | Yael (M15, צריכת תמלול)                |
| **M11** | `feature/step-timers` (+ cooking) | Yael  | יום 4, ~12:00 | אין — עצמאי                            | Shira (M14)                            |
| **M14** | `feature/cooking-voice-commands`  | Shira | יום 4, ~15:00 | ⏸️ **M11** (cooking.component + TTS)   | —                                      |
| **M15** | `feature/ai-import`               | Yael  | יום 4, ~15:00 | M10 (AI server) + M13 (voice)          | —                                      |
| **M16** | `feature/i18n-rtl`                | Shira | יום 4, ~16:30 | אין — עצמאי                            | —                                      |
| **M17** | `feature/ci-cd`                   | Shira | יום 4, ~18:00 | כל פיצ'רי הלקוח מוזגו                  | —                                      |
| **M18** | `feature/ci-cd`                   | Yael  | יום 4, ~18:00 | כל פיצ'רי השרת מוזגו                   | —                                      |


**תלויות באותו יום (חוסמות — חייבות `⏸️ ממתינה ל-MERGE`):**

- M4 (Yael) ⏸️ ממתינה ל-M2 (Shira) ~15:00 — חלק ה-OAuth ב-`auth.routes` נכתב מעל register/login של Shira.
- M14 (Shira) ⏸️ ממתינה ל-M11 (Yael) ~12:00 — `cooking-stt.service` נכנס לתוך `cooking.component` של Yael.

כל שאר התלויות הן בין-יומיות (ה-MERGE כבר מוזג ביום קודם) ולכן **אינן חוסמות** ומסומנות "כבר זמין".

> **בעלות הענף המשותף `feature/ai-import`:** שלושה מיזוגים יושבים על אותו ענף בבעלות שתינו — M10 (Shira), M13 (Yael), M15 (Yael). חלוקת קבצים מפורשת כדי שלא תהיה עריכה מקבילה לאותו קובץ: **Shira בעלת `ai.service.js` / `ai.controller.js` / `ai.routes.js`**; **Yael בעלת `voice.service.js` / `voice.controller.js` / `voice.routes.js` + ה-wizard בלקוח**. החיבור ביניהם דרך חוזה קלט/פלט מוסכם מראש (ראו יום 3).

---

## נקודות תיאום קבועות (כל יום)

- **בוקר (15 דק')**: סנכרון קצר — מי נוגע באילו קבצים היום + מה נמזג מאתמול (לפי לוח MERGE), כדי למנוע קונפליקטים ב-`app.js` / `app.routes.ts`.
- **כלל זהב**: לא נוגעות ישירות ב-`server/app.js` ו-`client/src/app/app.routes.ts` — כל פיצ'ר נרשם דרך `routes/index.js` (שרת) ו-`loadChildren` נפרד (לקוח).
- **בעלות `auth.routes.js`**: אני בעלת register/login (M2). Yael מוסיפה את חלק ה-OAuth **רק אחרי MERGE M2** (M4) — עריכה עוקבת, לא מקבילה.
- **סוף יום**: push לענף הפיצ'ר + פתיחת PR ל-`develop` כשהחלק עצמאי ועובר CI; עדכון שעת ה-MERGE בלוח המשותף.

---

## יום 1 — Auth בשרת (ליבה) + ליבת Auth בלקוח

**מטרת היום:** לסיים את אימות המשתמש בצד השרת (זה הבסיס לכל הנתיבים המוגנים של שתינו — לסיים מוקדם!) ולהתחיל את שכבת ה-Auth בלקוח.

### משימה A — Auth בשרת (ליבה)

- **ענף Git:** `feature/auth-jwt-bcrypt`
- **⏸️ ממתינה ל:** M1 (Yael — התקנת `jsonwebtoken`/`bcrypt` + `.env.example` עם `JWT_SECRET`), ~11:00 — באותו יום, לכן לא מתחילים ריצה לפני MERGE M1.
- **MERGE שלי:** M2, ~15:00
- **⚠️ סיכון לו"ז הדוק:** בין M1 (~~11:00) ל-M2 (~~15:00) יש ~4 שעות לכל ליבת ה-Auth בשרת (jwt + auth.service + controller + routes + middleware). לוודא ש-Yael מסיימת את M1 מוקדם ככל האפשר; אם M1 מתעכב — לדחות את M2 ולעדכן בלוח.
- תוכן: `server/utils/jwt.js` (sign/verify) · `server/services/auth.service.js` (register עם bcrypt + login + הנפקת JWT) · `server/controllers/auth.controller.js` · `server/routes/auth.routes.js` (**register/login בלבד**, דרך `routes/index.js`) · `server/middleware/auth.middleware.js` (אימות JWT + `req.userId`).

### משימה B — Auth ליבה בלקוח

- **ענף Git:** `feature/auth-jwt-bcrypt`
- **⏸️ ממתינה ל:** אין — עצמאי
- **MERGE שלי:** M3, ~18:00
- תוכן: `client/src/app/core/services/auth.service.ts` (register/login + שמירת token) · `core/interceptors/jwt.interceptor.ts` · `core/guards/auth.guard.ts`.

**Deliverable:** הרשמה/התחברות עובדות מקצה לקצה בשרת + interceptor/guard בלקוח מוכנים.

---

## יום 2 — Recipes API בשרת + מסכי Auth (login/register) בלקוח

> לפי הכלל: מסכי login/register הם יום 2 ו**אינם** מאוחדים עם פיצ'ר Recipes (שעבר ליום 3). שני ענפים נפרדים, שני MERGE נפרדים.

### משימה A — Recipes API (שרת)

- **ענף Git:** `feature/recipes-crud`
- **⏸️ ממתינה ל:** M2 (`auth.middleware`, מוזג יום 1) — כבר זמין, לא חוסם.
- **MERGE שלי:** M6, ~12:30
- תוכן: `server/services/recipe.service.js` (CRUD מלא, סינון לפי `userId`, `instructions[].timer{duration, hasTimer}`) · `recipe.controller.js` · `recipe.routes.js` (מוגן ב-`auth.middleware`) · בדיקת בעלות בכל פעולה. `category` ref קיים במודל — לא תלוי בלוגיקת העץ של Yael.

### משימה B — מסכי Auth (login/register) בלקוח

- **ענף Git:** `feature/auth-jwt-bcrypt`
- **⏸️ ממתינה ל:** M3 (`auth.service` בלקוח, מוזג יום 1) — כבר זמין.
- **MERGE שלי:** M7, ~17:30
- תוכן: `client/src/app/features/auth/` — login + register (טפסים + ולידציה) · `features/auth/auth.routes.ts` + `loadChildren` בודד ב-`app.routes.ts` · חיבור ה-guard לנתיבים מוגנים.

**Deliverable:** API מתכונים מלא ומוגן + משתמש נרשם/מתחבר דרך ה-UI.

---

## יום 3 — Recipes UI בלקוח + שכבת AI בשרת

### משימה A — Recipes UI (לקוח)

- **ענף Git:** `feature/recipes-crud`
- **⏸️ ממתינה ל:** M6 (Recipes API, מוזג יום 2) — כבר זמין.
- **MERGE שלי:** M9, ~12:00
- תוכן: `core/services/recipe.service.ts` + `recipe.model.ts` · `features/recipes/` — list / detail / form (כולל עריכת `instructions` עם טיימר) · `features/recipes/recipes.routes.ts` + lazy ב-`app.routes.ts`.

### משימה B — שכבת AI בשרת (החלק הקשה ביותר שלי)

- **ענף Git:** `feature/ai-import`
- **⏸️ ממתינה ל:** M1 (`upload.middleware`, מוזג יום 1) — כבר זמין.
- **MERGE שלי:** M10, ~18:00
- תוכן: `server/utils/recipeSchema.js` · `server/services/ai.service.js` (חילוץ JSON מטקסט/PDF/תמונה לפי `recipeSchema`, Structured Outputs) · `ai.controller.js` + `routes/ai.routes.js`, שימוש ב-`upload.middleware`.
- **חוזה עם Yael (לא חוסם):** `voice.service` שלה (M13, מוזג יום 3) מתמלל אודיו→טקסט ומזין את `ai.service`. אני **לא** נוגעת ב-`voice.service`/`voice.controller`. לסכם פורמט קלט/פלט מראש כך שה-wizard של Yael (M15, יום 4) יחבר את שני ה-endpoints.

**Deliverable:** משתמש מנהל מתכונים מלא בלקוח + ה-AI מחלץ מתכון מובנה מטקסט/PDF/תמונה בשרת.

---

## יום 4 — מצב בישול (STT) + i18n/RTL + CI

### משימה A — מצב בישול: `cooking-stt.service`

- **ענף Git:** `feature/cooking-voice-commands`
- **⏸️ ממתינה ל:** **M11** (Yael — `cooking.component` + `cooking-tts.service` + טיימרים), יום 4 ~12:00 — באותו יום, לכן ממתינה ל-MERGE M11 לפני חיבור ה-STT.
- **MERGE שלי:** M14, ~15:00
- תוכן: `features/cooking/cooking-stt.service.ts` **בלבד** — האזנה רציפה (Web Speech API) לפקודות: "עצור"/"המשך"/"קודם"/"הבא" + stop/continue/previous/next · אינדיקטור מיקרופון + כפתור toggle · ניהול echo: השהיית ההאזנה בזמן TTS פעיל (לפי דגל ה-state שמגדירה Yael ב-`cooking.component`). אני **לא** בעלת `cooking.component`.

### משימה B — i18n + RTL/LTR

- **ענף Git:** `feature/i18n-rtl`
- **⏸️ ממתינה ל:** אין — עצמאי (מיזוג מחרוזות עם Yael בתיאום, לא חוסם).
- **MERGE שלי:** M16, ~16:30
- תוכן: `assets/i18n/he.json` + `en.json` (מחרוזות שלי) · החלפת שפה דינמית: עדכון `document.documentElement.dir` (`rtl`/`ltr`) ו-`lang` · סגנון לוגי (`margin-inline`, `text-align: start`) במקומות שנגעתי בהם.

### משימה C — CI (job client)

- **ענף Git:** `feature/ci-cd`
- **⏸️ ממתינה ל:** כל פיצ'רי הלקוח מוזגו ל-`develop`.
- **MERGE שלי:** M17, ~18:00
- תוכן: השלמת `.github/workflows/ci.yml` — **הוספת** job ה-**client** (`ng lint`, `ng test` headless) **על גבי** ה-`client-build` הבסיסי שכבר קיים (ראו "פעולה מקדימה" למטה). Yael מסיימת את job ה-**server** (M18). מיזוג סופי, בדיקת CI ירוק, תיוג Milestone.

> **פעולה מקדימה (לפני יום 1):** הקמתי את תשתית ה-CI המינימלית ב-`feature/ci-cd` עוד לפני תחילת הספרינט: `.github/workflows/ci.yml` עם שני jobs — `server-build` (`npm ci`) ו-`client-build` (`npm ci` + `ng build`) — **ללא טסטים**, כך שה-CI ירוק מיד. ב-M17 רק מוסיפים lint + tests.

**Deliverable:** פקודות קוליות עובדות במצב בישול + מעבר שפה he/en עם RTL/LTR + CI client ירוק.

---

## סיכום תלויות שחשוב לי לזכור

1. **M2 (`auth.middleware`, יום 1)** — קריטי מוקדם; גם Recipes שלי (M6) וגם Categories של Yael (M5) בנויות עליו, ו-Yael ממתינה לו ל-OAuth (M4). לו"ז הדוק מול M1 — לסיים מהר.
2. **M1 (upload, של Yael, יום 1)** — אני ממתינה לו ל-Auth שרת (deps) ול-AI server (M10).
3. **חוזה AI↔Voice (יום 3)** — `voice.service` של Yael (M13) מזין את `ai.service` שלי (M10); `voice.service` בבעלות Yael בלבד. הענף `feature/ai-import` משותף — לשמור על חלוקת קבצים (`ai.`* שלי, `voice.*` + wizard של Yael).
4. **M11 (`cooking.component` של Yael, יום 4)** — אני ממתינה לו לפני `cooking-stt.service` (M14); להגדיר מראש את דגל "TTS מדבר" כדי למנוע echo.

