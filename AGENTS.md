# Enterprise Hospital Management System

React + Vite + Tailwind CSS frontend for a hospital management system, backed by a microservice backend (see `hospital-backend/`, symlinked to `keppler-backend/`).

## Development Server

Start the frontend with `npm run dev`; it serves on `$PORT` (default 8443). That script is
[scripts/dev.mjs](scripts/dev.mjs), which also makes sure the embedded Keppler OCR frontend is up on
port 3000 (see below), installing its `node_modules` first if they're missing. Without the port-3000
server, every `/keppler-ocr` and `/api` request through the host dev server returns **502 Bad
Gateway** and the OCR/summarizer/RAG features come up blank.

Keppler is started **detached and left running** when the HMS server stops, so restarting the main
app does not restart Keppler; a second `npm run dev` reports `already running on port 3000 -- leaving
it alone` and reuses it. Its output goes to `keppler-ocr.log` (gitignored) rather than the terminal.
Stop it with `npm run dev:stop`. Use `npm run dev:hms-only` to start only the HMS frontend.

Both servers are spawned via each project's local `node_modules/.bin/vite` rather than `npx`:
`npm exec` adds an `sh -c` wrapper, so killing the child left vite orphaned holding the port.

The backend is 9 independent Flask services (auth, patients, appointments, er, billing, pharmacy, hr, ai, reporting) sitting behind an nginx API gateway, all defined in `keppler-backend/docker-compose.yml`. The frontend only ever talks to the gateway at `http://localhost:8010` -- same `API_BASE` as before the split, no frontend code depends on which service actually owns a route. Start the whole backend with `docker compose up -d` from `keppler-backend/`; each service also has a standalone entrypoint at `backend/services/<name>/app.py` (e.g. `services/auth/app.py`, `services/billing/app.py`) for running one service outside Docker. See `keppler-backend/backend/shared/` for the cross-service auth/CSRF/DB helpers every service imports, and `keppler-backend/gateway/nginx.conf` for the path-to-service routing table.

- Hot reload: Changes to source files are reflected immediately

## Keppler OCR (dpi-ocr)

`dpi-ocr-frontend/` and `dpi-ocr-backend/` are a copy of the standalone "Keppler AI Medical Document Intelligence Platform" (OCR, PDF summarizer, RAG assistant, document vault) — a separate application (its own React 18 + shadcn/Figma UI kit frontend, its own FastAPI + Postgres + Qdrant + Redis/Celery + vLLM backend), not merged into this app's frontend bundle. It's embedded via iframe as the top-level "Keppler OCR" nav item ([src/components/DpiOcrPortal.tsx](src/components/DpiOcrPortal.tsx), `src/App.tsx`'s NAV array — sibling to "Hosp AI", not nested under it).

**No login screen**: the embedded app has no separate identity for the HMS user to sign in with, so `dpi-ocr-frontend/src/app/lib/auth-context.tsx` signs it in silently against a single shared service account (`hms-embed`, registering it on first use if it doesn't exist yet) instead of showing its own login/2FA/welcome screens or a Sign Out control. This is the one behavioral change made to the copied app; the rest is unmodified.

**Load time**: opening the tab used to cost ~3.3s because Vite dev-transforms the module graph on first request, and [src/App.tsx](src/App.tsx) unmounted the iframe on every nav away, paying that cost again on every visit. Two fixes: `dpi-ocr-frontend/vite.config.ts` sets `server.warmup.clientFiles` so the graph is transformed at server start (cold first load ~0.58s), and `App.tsx` keeps `<DpiOcrPortal />` mounted-but-hidden once opened, so returning to the tab is instant and doesn't re-run the embed sign-in.

**Frontend serving**: `dpi-ocr-frontend/` runs as its own Vite dev server on port 3000 rather than a Docker-built static bundle, since `npm run build` was blocked in this environment. `npm run dev` starts it automatically via [scripts/dev.mjs](scripts/dev.mjs) and deliberately leaves it running when the HMS server stops (stop it with `npm run dev:stop`); to run it alone use `cd dpi-ocr-frontend && npx vite --port 3000 --host 0.0.0.0`. Its dependencies must be installed with `npm install --legacy-peer-deps` — it's a React 18 tree and plain `npm ci` fails on a React 19 peer conflict (`@emotion/react` / `@figma/astraui-kit` / `@mui/*`). A 502 on `/keppler-ocr` or `/api` means this server is down or its `node_modules` are missing; its own `vite.config.ts` sets `base: '/keppler-ocr/'`. Port 3000 isn't directly reachable from a browser outside this sandbox (only `$PORT`/8443 is forwarded), so it's reverse-proxied through the host dev server instead of loaded cross-port: [vite.config.ts](vite.config.ts) proxies `/keppler-ocr` (with `ws: true` for its HMR) and `/api` (the OCR app proxies `/api` to its own backend itself) to `http://localhost:3000`. `DpiOcrPortal.tsx` points its iframe at `/keppler-ocr/` by default; `VITE_DPI_OCR_URL` overrides it.

**Backend**: merged into `keppler-backend`'s docker compose stack (`hospital-backend/docker-compose.yml`, alongside the 9 hospital microservices), as `ocr-postgres`, `ocr-redis`, `ocr-qdrant`, `ocr-api` (port 7620), and `ocr-worker` — see the "Keppler AI (dpi-ocr)" section near the bottom of that file. `ocr-api`/`ocr-worker` reuse the already-built `dpi-ocr--main-api`/`dpi-ocr--main-worker` images (`build: context: ./dpi-ocr`, a symlink to this repo's `dpi-ocr-backend/`, in case a fresh clone needs to build them) rather than rebuilding, and point `VLLM_BASE_URL` at the already-running `vllm-qwen-7b` container on port 8700. Bring the whole stack up with `cd keppler-backend && docker compose up -d`; on a brand-new `ocr-postgres` volume, run migrations once with `docker exec keppler-backend-ocr-api-1 alembic upgrade head` (the API returns 500s on auth routes until this has run — `relation "users" does not exist`). Check status with `docker ps --filter name=keppler-backend-ocr`.

The standalone deployment this was originally merged from (Docker project `dpi-ocr--main`, built from `/home/kalpra/Videos/dpi-ocr--main (2)/dpi-ocr--main`) is fully retired — its api/worker/frontend containers are removed/stopped; only its postgres/redis/qdrant are left stopped-but-not-removed in case that old test data is ever needed back.

## ICU daily flowsheet

The standalone **ICU** nav item ([src/components/ICU.tsx](src/components/ICU.tsx)) is the rolled-back
original design plus a rebuilt overview; the **Inpatient → ICU** ward tab is a different component
([src/components/IcuDepartment.tsx](src/components/IcuDepartment.tsx)) and is deliberately untouched.

The nurse's paper ICU chart is modelled in
[src/components/icu/flowsheetSchema.ts](src/components/icu/flowsheetSchema.ts) (sections/fields) and
rendered by [src/components/icu/IcuFlowsheet.tsx](src/components/icu/IcuFlowsheet.tsx), grouped into
7 colour-coded tabs. One record per patient per calendar day.

**Persistence** is the patient's clinical record, not local storage: `icu_flowsheets`
(one row per patient-day, whole chart as a JSON `data` column — the shape is owned by the frontend
schema, so it is not normalised into columns). See `ensure_icu_tables()` and
`upsert_icu_flowsheet` / `get_icu_flowsheet` / `list_icu_flowsheets` in
`backend/utils/database.py`, and the routes in `backend/modules/icu/routes.py`:

- `GET  /api/icu/<patient_id>/flowsheets` — day-wise index (no data blob), newest first
- `GET  /api/icu/<patient_id>/flowsheet/<YYYY-MM-DD>` — one chart day
- `PUT  /api/icu/<patient_id>/flowsheet/<YYYY-MM-DD>` — upsert (`patients.clinical.write`)

Every recorded chart day is also emitted as an `icu` stage event by `get_patient_journey()`, so the
flowsheet shows on the patient journey rather than living as a side file.

`localStorage` is kept as a **write-through cache only**, so a nurse mid-chart does not lose entries
to a dropped network; the UI shows `Saved to record` / `Offline — saved locally` accordingly. Saves
broadcast on a `BroadcastChannel` so other open tabs reload the same patient-day immediately.

## Reaching the backend from a browser

`API_BASE` ([src/lib/constants.ts](src/lib/constants.ts)) is **`/hms-api`, a same-origin
path**, not `http://localhost:8010`. `vite.config.ts` reverse-proxies that prefix onto the
gateway, stripping it before forwarding (the backend's own routes already live under
`/api`, and plain `/api` belongs to the embedded Keppler app).

An absolute localhost URL only resolves when the browser happens to run on the same
machine as the backend. Opened through a tunnel, a forwarded port, or from another device,
`localhost:8010` is the *viewer's* machine, nothing is listening there, and every call
fails as **"Failed to fetch"** — which is what an uploaded prescription did, since a typed
sheet degrades to the browser splitter but a photograph has no browser-side OCR to fall
back on. Two more walls stood behind that one: the gateway's CORS allowlist admits
localhost origins only (a tunnel hostname is rejected outright), and the session cookie is
`SameSite=Lax`, so it would be withheld from cross-site POSTs anyway. Going through this
server makes the calls same-origin and settles all three at once.

The `preview` block carries the same proxies — it had none, so a previewed build (which is
what gets tunneled for demo links) 404'd on every backend call and on the whole embedded
Keppler app. `VITE_API_BASE` still overrides everything at build time for the Cloudflare
Pages deploy, where the backend is a tunnel URL this server cannot proxy.

## Demo logins and the backend session

The login screen's role picker fills a demo account from
[src/lib/demoCredentials.ts](src/lib/demoCredentials.ts). **Two separate things have to
agree there**, and for a long time they did not:

- the **local RBAC store** (`RoleDatabase`), which decides which modules the signed-in
  user may navigate to -- every account in it uses `password123`;
- the **backend** (`create_default_users` in `hospital-backend/backend/core/auth.py`),
  which issues the session cookie authenticated APIs need. It seeds `employee`,
  `admin`, `staff` and `doctor`, each with its own password, none of them `password123`.

The picker used to fill `password123` for every role, so `/api/auth/login` always
returned **401**, `apiFetch` fell through to its offline mock, and the user was logged in
with no backend session. Nothing looked wrong until an authenticated endpoint was needed
-- **uploading a prescription failed with a 401 nobody could see**, because a typed sheet
degrades to the browser splitter but a photograph cannot: there is no OCR in the browser.

So `Login.tsx` now does two things at once: it authenticates against the local store for
identity and module access, and *separately* opens a backend session with that role's
mapped credentials. The backend call is best-effort -- the app stays usable offline -- and
module access deliberately comes from the local store, never from the backend's
`permissions` (granular strings like `patients.appointments.write`, not the module names
`App.tsx` gates navigation on) or its much shorter `module_access`. Taking either would
strip a doctor of `doctor_portal` and lock them out of their own portal.

`checkPrescriptionAiStatus()` in [src/lib/prescriptionAI.ts](src/lib/prescriptionAI.ts)
reports whether that session exists, and the prescription step says so *before* the
doctor uploads. It uses a raw `fetch` on purpose: `apiFetch` answers `/api/auth/session`
from its own offline mock with `authenticated: true`, which is right for a UI that must
work without a backend and useless for deciding whether server-side OCR will succeed.

## Doctor portal

Each physician signs in as **themselves** (the login's Role dropdown gains a *Physician* picker when
the doctor role is selected) and lands on **My Doctor Portal**
([src/components/doctor/DoctorPortal.tsx](src/components/doctor/DoctorPortal.tsx)), scoped to that one
doctor. This is separate from the older hospital-wide **Clinical → Doctor Workflow**
([src/components/DoctorWorkflow.tsx](src/components/DoctorWorkflow.tsx)), which is untouched.

**Inbox.** Patients appointed to this doctor, with their symptoms, newest first. Notifications are
*derived* from the OP encounter queue (`encounter.assignedDoctor === doctor.name`) rather than stored,
so a booking made anywhere else in the app shows up without a second write path; only read/seen state
is persisted. A first visit opens on a **new admit card**; a revisit opens on prior consultations,
medication, investigations and results. Reception's `isNew` flag wins over the local visit index for
"not new" — see `isFirstVisit` in
[src/services/doctorPortalDb.ts](src/services/doctorPortalDb.ts).

**The conversation and the prescription are two different things.** The portal is
four steps -- patient history, *consultation*, *prescription sheet*, review and send --
and steps 2 and 3 are deliberately separate. What is spoken in the room is history,
examination and advice; a doctor does not read a prescription out at the patient. So
the voice transcript produces a **clinical note and nothing else**, and orders come
only from the sheet. [src/lib/medicalVoiceAI.ts](src/lib/medicalVoiceAI.ts) has no
drug or test vocabulary in it at all -- that is the enforcement, not a convention --
because a medicine invented out of a noisy microphone is a dispensing error.

**Step 2 -- voice, speaker separation, note**
([`ConsultationConversation`](src/components/doctor/DoctorPortal.tsx)). Web Speech
recognition in Telugu, Hindi, Tamil, Kannada or English, normalised into chart
vocabulary by `normalizeMedicalSpeech` (symptom, anatomy, timing and numeral rules;
numerals run first, since the duration rules consume the word they anchor to).

Speaker separation works three ways at once, strongest first: the doctor holding the
Doctor/Patient switch (`forcedSpeaker`, which skips the heuristics entirely); weighted
phrasing cues in `attributeSpeaker` -- who a sentence is about, whether it asks or
answers, plus a `TURN_GAP_MS` pause as the floor changing hands; and one-click
correction on any turn. A one-point win over whoever just spoke is *overruled* by turn
order rather than reported as a decision. Every turn keeps the `cues` that decided it
and a `confidence`, so a shaky attribution is flagged for the doctor instead of
disappearing into a wall of text -- `setTurnSpeaker` then makes the correction
authoritative (`basis: "manual"`).

`summariseConsultation` builds the SOAP note from those turns, each section claiming
its lines before the next one looks, so an impression ("this looks like a viral
infection") never files itself as an examination finding. It also reports what the
conversation did *not* cover. The note is derived on every read, never stored
separately, so it cannot drift from the transcript it summarises; the turns and the
note are persisted on `ConsultationRecord.voice` (the audio is not -- same quota
reasoning as the video).

**Step 3 -- the prescription sheet**
([`PrescriptionSheetStep`](src/components/doctor/DoctorPortal.tsx)). Typed, drawn on
the whiteboard ([src/components/doctor/PrescriptionWhiteboard.tsx](src/components/doctor/PrescriptionWhiteboard.tsx),
vector strokes with an ink layer separate from the ruled sheet so the eraser doesn't
punch through), or photographed/scanned. **Uploading is the action**: the split runs
the moment the file lands, because handing over the sheet *is* the instruction. PDFs
go through `readPrescriptionFile` rather than a canvas (which silently dropped them),
and every failure is surfaced -- `splitPrescriptionFile` tries the prescription
endpoint, then Smart OCR, and if both are down says so and tells the doctor to type
the lines, rather than returning an empty split that reads as "this prescription has
no medicines on it". A consultation video is optional and sits below the sheet.

`POST /api/ai/prescription-parse` (ai-service; `split_prescription` in
`backend/ai/service.py`, route in `backend/modules/ai_exports/routes.py`) OCRs an image
if needed and returns the two halves separately. The `engine` field says which ran, and
the UI labels it. **The split is always editable before dispatch** -- it is a first
pass over handwriting, not an authority. The note's impression and advice are *offered*
at review as one-click fills, never written into the chart automatically.

**Two things that silently broke the handoff**, both fixed and both worth not
reintroducing:

- Dispatch moves the encounter to `Awaiting Billing`, which is not in `OPEN_STATUSES`,
  so resolving the selected visit from the *open inbox alone* made the patient vanish
  the instant the doctor pressed send -- taking the confirmation, the prescription id and
  the lab order id with it. A dispatch that had in fact succeeded looked exactly like one
  that had failed. `selected` now falls back to the full list, closed visits included.
- The pharmacy dashboard's "awaiting verification" tile kept its own status list and
  omitted `Sent To Pharmacy` -- the very status the portal dispatches with -- so a
  prescription sat in the verification queue while the pharmacist's landing screen
  reported nothing to do. Both now share `isAwaitingVerification` from
  [src/services/pharmacyDb.ts](src/services/pharmacyDb.ts).

**Live board.** The portal opens on a real-time board (Live Board / Patient switch in its header,
[src/components/doctor/LiveBoard.tsx](src/components/doctor/LiveBoard.tsx)) rather than a blank
workspace: a ticking clinic pulse, this doctor's waiting queue with live wait timers, and an alert
list of everything that has moved.

Alerts are **derived on every read**, never stored
([src/services/doctorLiveFeed.ts](src/services/doctorLiveFeed.ts)), from the three stores other desks
actually write to — encounters (`db`), `LabOrderDatabase`, `PharmacyDatabase` — so an alert can never
disagree with the record behind it. Only things the doctor can move are marked `actionable`: call a
patient in, put the active one on hold, review a returned/critical result, withdraw an investigation
that reception has **not yet** billed (a paid one is a refund, which is reception's call —
`withdrawLabOrder` refuses it), or rewrite a prescription the pharmacist rejected. "Cleared" state is
kept as a set of alert ids in `hospai_doctor_acked_alerts_v1`; the id embeds the state that produced
the alert, so a *later* change to the same record raises a fresh one instead of arriving
pre-acknowledged.

Liveness comes from [src/hooks/useLiveClinic.ts](src/hooks/useLiveClinic.ts): in-tab store
subscriptions, the `storage` event for writes from **other tabs** (this is the only route by which
`PharmacyDatabase`, which has no `subscribe()`, reaches the doctor at all), and a one-second clock for
the timers. It returns `revision` (data) separately from `now` (clock) so derived data is not
recomputed sixty times a minute for a display-only timer.

**Dispatch** ([src/services/consultationDispatch.ts](src/services/consultationDispatch.ts)) sends each
half to its own department, and **the two halves are independent**. A consultation routinely
produces only one of them — medicines with no investigations, or investigations with no
medicines — so neither waits on the other. `dispatchConsultation(record, doctor, targets)`
takes an optional `{ pharmacy, lab }`; omit it and whatever is still outstanding goes.
`dispatchableHalves()` is the single answer to "what is left to send", derived from the
sheet's content and from `prescriptionId`/`labOrderId` on the record, which are the
receipts — so a half is never sent twice, and the doctor can send the medicines now and
add an investigation afterwards without reopening anything. Each half locks in the review
tables on its own receipt (`pharmacySent` / `labSent`), because medicines already at the
pharmacy must not be edited while investigations that have gone nowhere still can be.

An investigations-only sheet used to land in the pharmacy queue anyway: `hasPrescriptionData`
was true for any sheet content at all, and the empty-medications branch then invented a
placeholder item named "Doctor Prescription Sheet" — a phantom drug to dispense against a
lab-only order. Pharmacy now requires either an actual medicine or an **unread sheet**
(nothing legible *and* no investigations either, which means a photograph the AI could not
read and the pharmacist must). That placeholder still exists for exactly that case and now
says what it is rather than looking like something to dispense.

The visit close-out reasons about the sheet as a whole rather than this one call, so sending
the halves separately leaves the encounter in the same state as sending them together: a
lab order means `Awaiting Billing`, a half still outstanding means the visit stays `Under
Consultation`, and only a fully-sent sheet marks the consultation `Dispatched`.

The two destinations are:

- **Medicines → pharmacy.** An `AppPrescription` in the existing `PharmacyDatabase` queue, status
  `Sent To Pharmacy`, carrying the patient's details plus a one-line clinical summary in
  `verificationNotes`. An image-sourced sheet is marked `OCR` so the pharmacist verifies it against the
  original.
- **Lab tests → reception → laboratory.** A `LabOrder` in
  [src/services/labOrdersDb.ts](src/services/labOrdersDb.ts), priced from that file's rate card.
  **An unpaid order is invisible to the lab**: `getLabWorklist()` excludes `Awaiting Billing`, and only
  `markBilled` moves it to `Billed`. Reception takes payment in **Billing → Lab Test Billing**
  ([src/components/LabBillingQueue.tsx](src/components/LabBillingQueue.tsx)); it then appears on the
  laboratory worklist ([src/components/Laboratory.tsx](src/components/Laboratory.tsx)) for sample
  collection, processing and result entry. That screen's original static demo data is still there but
  only renders while no real order exists.

Both stores are localStorage-backed with `BroadcastChannel` fan-out, like the rest of this frontend.
`hospai_rbac_roles_v3` (bumped from v2) is what grants the new `doctor_portal` and `lab_billing`
modules to existing browsers.

## Insurance department

One insurance engine shared by OP / IP / ER / OT / ICU —
`InsuranceEngineService` in [src/services/insuranceDb.ts](src/services/insuranceDb.ts). The UI is deliberately
small: **three pages**, no pictographs, one blue accent, light borders, sentence-case labels.

- **Claims** (`insurance`, [ClaimsHome.tsx](src/components/insurance/ClaimsHome.tsx)): one worklist filtered by
  stage ("Needs action" first). A row opens the claim screen
  ([ClaimWorkspace.tsx](src/components/insurance/ClaimWorkspace.tsx)): the 8 stages down the left, and tabs
  *Current step* (one sentence + the one form it needs, from `NextStep` in forms.tsx), *Documents*, *Emails*,
  *Details*, *History*.
- **Settlements** (`insurance_settlement`): advice → payment → reconcile → close, one list per step; a row opens
  a side panel with its details and action.
- **Setup** (`insurance_masters`): tabs for insurers, TPAs, packages, pricing rules, document rules.
- Older keys (`insurance_desk`, `insurance_preauth`, `insurance_claims`, `insurance_queries`,
  `insurance_reconciliation`, `insurance_tpas` …) still work and land on those pages (`insuranceModule()` in
  App.tsx), so links from the rest of the HMS keep working.
- Tailwind radius note: this app's theme redefines `rounded-md`/`rounded-lg` (14px/18px), so the insurance
  UI uses explicit `rounded-[6px]` / `rounded-[8px]`.

**The process is the hospital's 8-stage claim chart** — Admission, Eligibility, Pre-Authorization,
Treatment / Surgery, Discharge & Final Bill, Claim Submission, Claim Adjudication, Settlement —
defined once in `DESK_STEPS` ([deskGuide.ts](src/components/insurance/deskGuide.ts)); the Claims worklist
filters by it and the claim screen shows it. The engine's 22 statuses map onto those stages.

**Insurers are dealt with by email** ([mail.tsx](src/components/insurance/mail.tsx)). The desk verifies each
document (`verifyDocument` / `verifyAllUploaded`; *uploaded is not enough* — `missingMandatory` requires
`Verified`), then `sendInsurerEmail` sends it: for a pre-auth, claim or query response the email *is* the
submission. The insurer's reply is pasted in (`InsurerReply` → `recordInsurerEmail`) and filed alongside the
decision recorded from it. Every mail is kept on the case (`c.mails`, claim → Emails tab). There is no mail
server: "Send" records the mail and moves the case; "Open in mail app" hands it to the desk's mail client.

**Cases belong to the encounter.** A case is opened from an insured bill, or before any bill exists
(`openEncounterCase` — admission payment type, ER quick capture); `sync()` links such a case to the first
open cashless-eligible bill raised for the same patient and marks that bill insured. Every action on a case
is mirrored onto its bill through `billing(c)`, which is a no-op until a bill is linked. OP encounters are
refused. Every transition goes through `move()` (validated against `INSURANCE_TRANSITIONS`, written to the
audit trail with user, role, device).

**HMS integration** ([integrations.tsx](src/components/insurance/integrations.tsx)): the patient chart's
Insurance tab (several policies per patient, eligibility per policy, cases per encounter), Admissions →
Payment type, ER quick insurance, OT procedure → package → pre-auth (`linkProcedure`), the Discharge
checklist's insurance clearance (`dischargeReadiness`), and a status chip on bed cards (no amounts). They open
insurance pages with the `hms:open-insurance` window event that `App.tsx` listens for.

**Documents are stage-aware.** `classifyDocument()` maps an insurer's wording to one canonical requirement so
the same document is never asked for twice, and pre-auth only asks for what can exist on admission.

**Permissions**: `insurance.*` strings in a role's `allowedModules` (`INSURANCE_PERMISSIONS` in
[src/services/roleDb.ts](src/services/roleDb.ts)), enforced by the engine (`need()`), not the UI. A role with
the insurance module but no `insurance.*` entries keeps full access. Roles: Insurance Officer, Finance, Billing;
Reception gets view + capture; doctors get the clinical side.

The backend has no insurance service yet; the engine is localStorage-backed like the rest of the frontend.

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.
