# ElderEase — build status

Written 10 September 2026. Use this to decide what the presentation may claim.

The rule applied throughout: **a feature is "done" only if it was exercised and
seen to work**, either in the browser or against the running API. Anything that
is written but has not been run is listed separately, and anything genuinely
absent is named as absent. Nothing here is rounded up.

---

## 1. Verified working — safe to put on a slide

Each of these was exercised this session and behaved correctly.

### Real authentication and account separation

Sixteen requests were fired at the running server. All sixteen answered correctly:

| # | Request | Expected | Got |
|---|---|---|---|
| 1 | Caregiver A reads Caregiver B's patient records | denied | `403` |
| 2 | Caregiver A writes Caregiver B's patient records | denied | `403` |
| 3 | Caregiver A deletes Caregiver B's patient | denied | `403` |
| 4 | Caregiver A resets Caregiver B's patient's password | denied | `403` |
| 5 | No cookie, reads patient records | denied | `401` |
| 6 | Owning caregiver reads their own patient's records | allowed | `200` |
| 7 | No cookie, lists caregiver roster | denied | `401` |
| 8 | Patient calls a caregiver-only endpoint | denied | `403` |
| 9 | Patient tries to create a patient account | denied | `403` |
| 10 | Patient reads a **different** patient's records | denied | `403` |
| 11 | Patient reads their own records | allowed | `200` |
| 12 | Patient deletes their own account | denied | `403` |
| 13 | Visitor self-registers asking for `role: "patient"` | becomes caregiver | role = `caregiver` |
| 14 | Duplicate email registration | rejected | `409` |
| 15 | Weak password at registration | rejected | `400` |
| 16 | Correct email, wrong password | rejected | `401` |

Also confirmed:

- **Session cookie is `HttpOnly; SameSite=lax`**, and `secure` in production
  (`lib/server/session.ts:73`). JavaScript on the page cannot read it.
- **No password or hash appears in any API response.** Passwords are stored
  scrypt-hashed; the app has no code path that reads one back.
- **Patients cannot self-register.** `/api/auth/register` ignores any requested
  role and always creates a caregiver. A patient account exists only because a
  signed-in caregiver made one.
- **A new caregiver starts genuinely empty** — registered a fresh account and it
  came back with `patientIds: []`. No demo patients, no inherited data.
- **Deleting a patient really deletes them.** Created a patient, confirmed login
  worked (`200`), deleted them, then: login `401`, records `404`, and in the
  database the user row, patient row and all seven record rows were gone, with
  **zero orphan rows** left behind.

This is real server-side persistence — SQLite, `data/elderease.db` — not
localStorage. Two caregivers each with their own patients were live at once
during these tests and never saw each other's data.

**Slide wording that is accurate:** "Server-side accounts with hashed passwords,
HttpOnly session cookies, and ownership checks on every request. A patient can
only ever load their own record."

**Do not claim:** HTTPS/TLS, rate limiting, account lockout, email verification,
or password reset by email. None of those exist.

### Activity tracking that tells the truth

The largest fix of the session. A run of a puzzle now has three honest states —
`completed`, `abandoned`, `in_progress` — instead of a single boolean.

Why it mattered: someone with memory difficulty who opens a puzzle, finds it
tiring and stops was previously recorded as scoring **0%**, which dragged their
average down and could make an ordinary tiring afternoon look like decline.

Three separate bugs were behind it, all fixed:

- the AI engine never read the completion flag at all, so quits were scored;
- the game shell wrote a quit as a finished run with 0 correct out of 0;
- quitting still ticked the day's plan item off as done.

Verified in the browser: Sudoku shows **76% accuracy** with **"Stopped early: 3"**
listed separately beside it. The three abandoned runs are counted and shown but
do not touch the score. Old records written before this change are read through a
compatibility path, so no existing history was lost.

### AI insights and per-activity analytics

- `/care/insights` renders live insight cards from real session data.
- Per-game statistics: accuracy, best, average response time, time taken,
  mistakes, hints, stopped-early count, last played.
- Trend badges with **four** states — Improving / Steady / Needs a look /
  Not enough data — each with its own icon, so meaning never rides on colour
  alone. "Not enough data" is said out loud rather than faked as "steady".
- Language is deliberately non-diagnostic: **"Activity change detected in
  Recognition"**, never "dementia progression". Every analytics screen carries
  "ElderEase tracks app activity only… not a medical assessment or a diagnosis."

**Slide wording that is accurate:** "Adaptive difficulty and activity insights."
**Do not claim:** dementia detection, screening, or diagnosis of any kind.

### Caregiver alerts

`/care/alerts` renders seeded alerts with working acknowledge state and the
non-diagnostic disclaimer.

### Housekeeping

Five dead date/time helpers removed — they silently used the browser's timezone,
which is exactly the bug the timezone work fixed, and leaving them importable
invited its return. `npx tsc --noEmit` is clean.

---

## 2. Built and type-checked, but not yet clicked through

The code exists and compiles. It has not been exercised end-to-end this session,
so the presentation should describe it, but a demo should be rehearsed first.

- **Timezone support** — UTC in the database, IANA zone per user, patient and
  caregiver independent. `lib/utils/timezone.ts` is DST-correct (driven by
  `Intl.DateTimeFormat`, never manual offset arithmetic). `useFormats()` is
  consumed by 15 screens and components.
- **Reminder management** — Once / Daily / Weekdays / Weekly, enable-disable,
  one-time date filtering. One shared `lib/utils/reminders.ts` answers "is this
  due?" for the patient screen, the caregiver screen, the alert banner and the
  companion, so the two sides cannot disagree.
- **Family tree** — grouped by generation on `/care/family`.
- **Faces & Names** — draws on the caregiver's real family records rather than
  stock photos, with relationship-aware wrong answers.
- **Caregiver dashboard, activity log, progress** — activity log is in the mobile
  primary navigation bar.
- **Sudoku counter**, **404 page**, **localised dates and times**.

**Cost to verify all of it: about 1.5 hours** of clicking through.

---

## 3. Genuinely missing — keep these off the slides

Four items. These are the honest gaps.

### 3.1 Personalised activity content — written but never wired up

This is the most important one for the presentation, because it is the feature
most likely to be claimed.

A caregiver can record a person's interests, favourite foods, music, places,
people, conversation topics and dislikes. It saves. It persists. **Nothing in the
patient's experience uses any of it.**

`pickThemed()` — the function that would bias game content toward someone's
interests — is fully written in `lib/data/game-content.ts:130` and **is called
from nowhere**. Word Recall, Memory Match and Picture Recall all shuffle the raw
list. A cricket follower and a gardener see identical cards.

**Do not claim "personalised activities" yet.** *(~45–60 min to fix)*

### 3.2 Caregiver AI companion — absent

The companion exists only for patients. `app/app/layout.tsx` renders
`PatientShell`, which includes the companion; `app/care/layout.tsx` renders
`CaregiverShell`, which does not. There is no companion anywhere under `/care`.

**Do not claim an AI assistant for caregivers.** *(~1.5–2 hours)*

### 3.3 Selected patient is forgotten on reload

`activePatientId` lives only in memory. A caregiver looking after two people who
switches to the second and refreshes the page is silently put back on the first.
Nothing corrupts and no data mixes — it is a lost selection, not a leak — but it
looks broken in a live demo with two patients. *(~20–30 min)*

### 3.4 Translation coverage is thin

The interface has **997 translatable strings**. Actual coverage:

| Language | Keys | Coverage |
|---|---|---|
| Hindi, Bengali, Assamese | 339 | **34%** |
| Nepali | 194 | **19%** |
| Khasi, Mizo, Nagamese | 72–73 | **7%** |
| Bodo, Garo, Mishing, Meitei, Karbi, Ao, Kokborok | 62–63 | **6%** |

Everything untranslated falls back to English, so no screen breaks and nothing is
blank — but a Bodo speaker sees a mostly-English app.

**Accurate slide wording:** "15 languages supported, with navigation and core
screens translated for North-East Indian languages and English fallback
elsewhere." **Do not claim** "fully translated into 15 languages".

---

## 4. Two other honesty constraints already respected in the build

Worth keeping in the presentation because they are differentiators, not
weaknesses:

- **Voice** — the app does not assume every browser supports speech recognition
  or synthesis in all 15 languages, because they do not. It degrades gracefully.
- **AI does not drive routing.** Voice and companion output pass through a
  controlled intent layer (`lib/voice/intents.ts`), so model output can never
  directly change application state.

---

## 5. Time to finish

Focused working hours, not calendar time.

### Tier 1 — makes the demo hold up (about 3 hours)

| Work | Time |
|---|---|
| Wire preferences into the three games (3.1) | 45–60 min |
| Persist the selected patient across reload (3.3) | 20–30 min |
| Translate the ~20 new strings into all 14 languages | 30 min |
| Click through everything in section 2 | 1.5 h |

After this, every claim in sections 1 and 2 is demonstrable.

### Tier 2 — closes the last real feature gap (about 2 hours more)

| Work | Time |
|---|---|
| Caregiver AI companion (3.2) | 1.5–2 h |

### Tier 3 — translation depth (3–4 hours more)

Bringing Hindi, Bengali and Assamese from 34% to complete is roughly 2,000
strings. This is the one item that cannot be meaningfully compressed, and it is
also the one the audience is least likely to test.

### Totals

- **Demo-ready: ~3 hours**
- **Feature-complete against the fix list: ~5 hours**
- **Everything including deep translation: ~8–9 hours**

Recommended order: Tier 1, then Tier 2, then Tier 3 only if time allows.
