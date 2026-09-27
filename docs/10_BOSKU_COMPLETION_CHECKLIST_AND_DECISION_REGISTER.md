# BOSKU COMPLETION CHECKLIST AND DECISION REGISTER

**Status:** Phase 3 code deployed; production owner setup and authenticated smoke pending
**Date:** 2026-09-27

## 1. Decision

The discovery and architecture phase is sufficiently defined to begin implementation.

Do not keep asking exploratory questions unless a new question blocks implementation, security, legal compliance, or an acceptance test.

Unknowns that are not blockers remain explicitly TBD and are resolved when evidence appears.

## 2. Locked decisions

- Bosku is not a replacement POS.
- KasirPro remains transaction authority.
- KasirPro Max API/integration is a future production integration.
- Paid Max access is not required for private MVP validation.
- CSV/Excel is the initial integration-proof bridge.
- Walk-in customers remain first-class.
- Booking is optional.
- Projected and actual revenue are separate.
- Return intervals are derived from observed history.
- Reminder sending is user-controlled.
- Unknown WhatsApp consent is not treated as permission.
- Important changes are auditable.
- No undocumented scraping or bypass of KasirPro.
- MVP remains useful when external integrations are unavailable.
- Avoid unnecessary operational data entry.
- No new POS/accounting/ERP scope without evidence.

## 3. Questions resolved enough for MVP

### KasirPro integration
**Private build → CSV/Excel proof → validation → real sale/deployment → KasirPro Max → official API**

Exact API contract remains a future verification task.

### Reminder sender
Primary sender is the capster/operator using their own WhatsApp.

### Reminder behavior
**Review candidate → prepared message → open WhatsApp → user sends**

### Data entry
Only request small fields that create clear value, such as customer name, WhatsApp, and consent when absent from the source.

### Customer identity
Use conservative matching and manual review for ambiguity.

### Financial authority
KasirPro remains authoritative for transaction/payment truth.

## 4. Remaining questions that are NOT blockers

These are measured during pilot:
- exact historical export period available;
- exact KasirPro export columns;
- percentage with customer names;
- percentage with WhatsApp;
- percentage reliably linked to a customer;
- observed return interval distribution;
- reminder response rate;
- reminder-to-booking conversion;
- dashboard metrics owner actually uses;
- future permission differences between owner and capster.

These should be measured, not guessed.

## 5. Implementation sequence

### Phase A — Foundation
- [x] app shell
- [x] authentication/roles
- [x] business/branch model
- [x] environment configuration (no secret required locally)
- [x] database migrations
- [x] audit foundation

### Phase B — Customer and visit core
- [x] customer records
- [x] visits
- [x] capsters
- [x] services
- [x] customer history
- [x] walk-in flow

### Phase C — Import proof
- [x] CSV file selection and bounded JSON transfer (256 KB / 300 rows)
- [ ] Excel upload (CSV export supported; XLSX pending)
- [x] column detection for common aliases
- [ ] complete mapping UI (required fields and two optional identity columns can be mapped; other aliases auto-detect)
- [x] validation
- [x] dry run
- [x] deduplication
- [x] provenance
- [x] idempotent commit
- [x] import report

### Phase D — Customer return engine
- [x] observed intervals from distinct completed visit dates
- [x] due calculation (documented observed median window)
- [x] due states
- [x] customer list
- [x] customer detail
- [x] return opportunity view

### Phase E — Booking and daily certainty
- [x] booking creation
- [x] optional capster selection
- [x] party size (per-person booking records)
- [x] status lifecycle
- [ ] confirmed/expected/walk-in/actual distinction (confirmed/walk-in/arrival/completed work; evidence-based expected remains future)
- [x] projected vs imported actual revenue separated; missing actual stays unavailable

### Phase F — Reminder workflow
- [x] explicit consent capture/revocation and server checks
- [x] due reminder candidates
- [x] single short message draft (configurable templates pending)
- [x] human review before preparation
- [x] user-initiated WhatsApp handoff (no automatic send)
- [ ] reminder event history UI (events stored and audited)

### Phase G — Owner BI
- [ ] daily overview
- [ ] customer return metrics
- [ ] service mix
- [ ] revenue snapshot
- [ ] operational exceptions
- [ ] simple trend views

### Phase H — Pilot hardening
- [ ] failure states
- [ ] mobile usability
- [ ] slow-network behavior
- [ ] duplicate protection
- [ ] audit review
- [ ] data export/backup
- [ ] acceptance tests
- [ ] pilot instrumentation

## 6. Definition of Done

### Core
- [x] app loads reliably (local Pages/D1 verified)
- [x] authentication works
- [x] roles are enforced
- [x] customer records work
- [x] visit lifecycle works
- [x] walk-in flow works
- [x] booking is optional and functional
- [x] daily view works

### Data
- [x] CSV import works in automated integration tests
- [x] dry-run works without writes
- [x] duplicate protection works
- [x] provenance is retained
- [x] import errors are understandable
- [x] customer matching is conservative (explicit ID/WhatsApp only; same-name customers stay separate)
- [x] imported transaction values remain immutable; conflicting external IDs are rejected

### Intelligence
- [x] last visit is visible
- [x] return intervals are calculated from distinct completed visit days
- [x] due state is visible
- [x] reminder candidate logic works
- [x] projected vs actual revenue is separated

### Safety
- [x] consent state is enforced on prepare AND handoff
- [x] no automatic WhatsApp blast
- [x] no secrets in source
- [x] audit trail works
- [x] financial mutation is blocked by default (no POS write route)
- [x] invalid/conflicting imports reject commit without modifying existing data

### Pilot
- [ ] realistic Bosku data loaded
- [ ] one full operating cycle tested
- [ ] owner/operator understands the dashboard
- [ ] capster completes core workflow without excessive typing
- [ ] pilot observations are recorded

## 7. Product validation gate

After the private MVP works, run a 7–14 day operational pilot before adding major features.

Measure:
1. Can the team understand who is due to return?
2. Does the system reduce manual follow-up?
3. Does daily certainty become clearer?
4. Does the owner receive useful information without extra reporting burden?
5. Does booking remain optional?
6. Does the system create measurable operational value?
7. Would the business continue using it if it were not free?

Only validated value unlocks larger scope.

## 8. Post-validation KasirPro integration gate

KasirPro Max should be purchased/implemented only when there is a concrete reason such as:
- a real paying customer requires direct integration;
- CSV/Excel has become a material bottleneck;
- automated synchronization is necessary for a validated workflow;
- deployment economics justify integration cost.

Before production connector work, verify and document the official KasirPro contract.

## 9. Open decision register

| Topic | Current state | When to decide |
|---|---|---|
| Exact KasirPro API endpoints | TBD | Before production connector |
| KasirPro API auth/scopes | TBD | Before production connector |
| Exact export schema | TBD | First real import |
| Historical data depth | TBD | First real import |
| Final public product/brand name | Not locked | Before commercialization |
| Multi-branch rollout | Architecture-ready, not MVP | After single-branch proof |
| Automated WhatsApp provider/API | Not required for MVP | After manual handoff proves value |
| Advanced BI | Deferred | After owner usage proves need |

## 10. Stop conditions

Stop and reassess if:
- the app requires more work than the manual process;
- staff must enter the same data twice without clear value;
- forecast numbers are mistaken for actuals;
- reminders are sent without clear consent;
- imported data produces unexplained duplicates;
- external integration becomes a dependency for core operations;
- features accumulate without pilot evidence.

## Phase 2 execution note (2026-09-27)

Sprint 3–4 operational exit gate passed locally: owner setup without manual token; customer create/search/edit/detail, conservative WhatsApp matching, capster/service management with owner-only mutation, walk-in without booking, booking with per-person visit records, Today, lifecycle/terminal states, and projection visibly distinct from unavailable actual. D1 migrations 0001–0002 were applied locally; automated tests and Wrangler smoke run passed. This is **not** the complete MVP: expected forecast, Kasir Pro import/actual, retention, reminders, offline queue, production deployment, and pilot remain open. BYOK production D1 has not been created. An earlier attempt hit the account database quota; the latest list suggests a slot may now be available, but a dedicated Bosku database must be created and verified before deployment. No unrelated D1 may be reused/deleted without explicit authorization.

## Phase 3 execution note (2026-09-27)

Implemented: owner-only CSV import preview/commit with detection, basic manual mapping, strict row validation, dedupe by external ID or file fingerprint + row, exact WhatsApp-only customer linkage, sync_run and audit; no fabricated transactions/visits. Snapshot source is **owner-provided Kasir Pro CSV**, not a verified direct API connector. Actual reports include imported snapshot values only; no export has yet been loaded into production. XLSX and full export-specific mapping remain pending until a real sample is available.

Return estimates use up to 101 recent completed visit records per customer, deduplicated by calendar date. At least 3 distinct dates / 2 positive intervals are required. Median of up to 5 recent intervals defines a window of median +/- max(2 days, ceil(20% median)); `due_soon` starts one half-window before the window, `due` is within it, `overdue` follows. This is an observed estimate, not a promise, probability or retention percentage. Transactions without reliable customer identity stay unlinked and do not generate invented visits. Only visits marked completed drive the current return engine.

Consent defaults to unknown. A staff member can record a direct customer statement and audit it. Prepare and handoff both recheck consent = yes; no system route sends WhatsApp, and `handoff_opened` does not assert delivery. Revocation blocks previously prepared handoffs. Reminder event history is stored but not yet surfaced in the UI.

CF BYOK deployment: dedicated D1 `bosku-one-system-db` (UUID `d1553757-d9b0-42e9-b89d-27fba2518d2a`), migrations 0001–0003 applied remotely; Pages `https://bosku-one-system.pages.dev` deployed successfully. Production UI, static assets, status, unauthorized API protection, bootstrap denial without secret, and D1 schema were verified. `BOOTSTRAP_TOKEN` is a Pages secret (not committed); the first owner must create their own account via the production setup form using the separately delivered one-time code. No owner or real transaction data has been inserted into production. **Authenticated production customer/visit/booking/import/return/reminder write smoke remains unverified**, so Phase 3 production verification is PARTIAL, not PASS. Local D1 and automated API tests cover these workflows. After the owner sets up, run authenticated smoke with real authorized account and consented test data, avoiding synthetic financial imports in production. No Kasir Pro API connector, XLSX import, full BI, pilot or offline write queue yet.

## 11. Final operating rule

**Questions are now evidence-driven, not exploration-driven.**

If an answer is required to build safely, ask it.

If it is not required, implement with a documented default and validate during the pilot.

**Next job: execute, test, load realistic data, observe real usage, and iterate from evidence.**
