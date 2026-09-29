# BOSKU COMPLETION CHECKLIST AND DECISION REGISTER

**Status:** Phase 4 PARTIAL — owner auth recovered; positive production import/due/reminder proof awaits real authorized evidence
**Date:** 2026-09-28

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

## Phase 4 production hardening and verification (2026-09-28)

**Root cause confirmed, not guessed:** the Phase 3 frontend `request()` built JSON headers then spread `options` afterward, so the production setup form's `{headers: {'X-Bootstrap-Token': code}}` replaced the entire header set. The browser sent `text/plain;charset=UTF-8` rather than JSON, and the server correctly returned HTTP 415 `{"error":"Gunakan JSON."}`. The dedicated production D1 had 0 owners/0 sessions before remediation. A request with explicit JSON Content-Type and intentionally invalid code returned 403, proving middleware/secret handling was functioning. No password, code, cookie value or token was logged or committed.

**Fix:** split `headers` from request options before merging with `Content-Type: application/json`, preserve same-origin credentials, handle non-JSON/unexpected API responses as explicit failures, return to login on expired authenticated sessions, show recoverable startup state, and remove a misleading generic success notification. No server auth bypass, cookie weakening, database reset or new product feature. Added HTTPS setup/session/cookie/logout/expiration tests and a browser-wrapper regression test; complete suite 14/14, typecheck and build pass. CF BYOK deploy completed against the existing `bosku-one-system` project; D1 UUID unchanged, migrations remain 0001–0003.

**Owner recovery:** before setup the D1 had no owner. A production owner `boskuowner` was created by this execution with a cryptographically generated password, stored privately and delivered through a user-session-protected artifact, **not** git. Production D1 confirms salted PBKDF2 hash, owner role and session record. Production login with correct password, refresh, authorized API, logout, rejection of the old cookie, re-login, a targeted expired session returning 401, and secure cookie (`HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`) all passed. Owner must rotate generated password via Pengaturan. Bootstrap code still exists as Pages secret; setup endpoint refuses a second owner (409). No publicly readable recovery credentials exist.

**Production smoke:** public page/assets/status, HTTPS JSON responses, invalid-cookie 401, cross-origin mutation 403, malformed JSON 400, owner-only route protection and password rejection verified. With explicitly labeled `PHASE4 SMOKE` records, customer create/update/detail/duplicate prevention, capster/service, walk-in and booking lifecycle, Today, return insufficient-history/unknown-consent, CSV valid/invalid **preview only**, and audit were verified. At 390px touch viewport, actual browser login, refresh, navigation, customer cards/detail, booking card, CSV preview and logout passed without JS errors or horizontal document overflow. Test customer, visits, booking, capster, service and price rows were removed by exact IDs after verification; temporary test sessions were revoked. The bootstrap owner and audit events were preserved. Production transactions=0, consent=0, reminders=0, so actual remains unavailable; no fake payment, historical visit, marketing consent, or WhatsApp send was inserted.

**Gate still open:** production commit of a real authorized Kasir Pro export, observed due candidate from three *real* completed-visit days, and consent-approved reminder preparation/handoff using actual customer permission have **not** been verified in production. Unit/integration tests cover these paths, but no synthetic consent or fabricated financial/history evidence was inserted to claim success. Therefore **Phase 4 STATUS = PARTIAL** and production verification = PARTIAL. Existing operations are usable, but the complete Phase 4 exit gate requires authorized real data/permission and another production smoke pass. Do not mark full PASS or start Phase 5 until then.

## 11. Final operating rule

**Questions are now evidence-driven, not exploration-driven.**

If an answer is required to build safely, ask it.

If it is not required, implement with a documented default and validate during the pilot.

**Next job: execute, test, load realistic data, observe real usage, and iterate from evidence.**


## 12. WORKLOAD-FIRST DECISION LOCK — 2026-09-28

The product thesis is now explicitly **workload-first**.

### Primary discovery layer
**OBSERVE** is the first layer and the reason a feature exists. Every future feature must begin from an observed real workload, burden, or gap.

### Execution layers
After observation, classify the workload as:

**HUMAN → SYSTEMATIC → AUTOMATION → AGENTIC**

These are not mandatory maturity stages. Select the lowest-complexity layer that safely removes the burden.

- **HUMAN:** physical work, relationship, nuanced judgment, sensitive decisions, accountability.
- **SYSTEMATIC:** storage, retrieval, calculation, workflow state, dashboards, deterministic rules.
- **AUTOMATION:** repeated rule/trigger/schedule-based execution.
- **AGENTIC:** multi-step reasoning, dynamic planning, adaptation, and orchestration where simpler layers are insufficient.

### Permanent rule
Do not add a feature because it is technically impressive. Build it because an observed workload justifies moving work from a human into the appropriate layer.

### Kasir Pro implication
Kasir Pro remains the transaction authority/reference layer. Manual entry or CSV can remain the bridge while the workload is small. Official API integration becomes justified only when real usage demonstrates that transaction synchronization has become a material operational bottleneck or automation requirement.

See:
- `docs/13_BOSKU_WORKLOAD_FIRST_OPERATING_MODEL.md`
- `docs/14_BOSKU_WORKLOAD_GAP_REGISTER_AND_LAYER_MAP.md`
- `docs/15_BOSKU_OBSERVATION_PLAYBOOK.md`
- `docs/16_BOSKU_LAYERING_DECISION_MATRIX.md`

**New product gate:** before implementing a new workflow, record the burden, evidence, chosen layer, simpler-layer rejection reason, human control, and success metric.

## Phase 5 — Neon PostgreSQL verified target (pre-cutover)

**State:** Neon schema and snapshot copy verified; live Cloudflare Pages still uses D1. This does **not** close the earlier real-customer/consent pilot gate or authorize production cutover.

**Source audit:** a private, untracked D1 remote export passed SQLite foreign-key check. Production D1 has 17 operational tables plus 3 D1 migration ledger entries: business=1, branch=1, owner=1, session=1, audit_event=12; customers/visits/transactions/consents/reminders/other operational records=0. Export contained no FK violations. All 16 operational records plus 3 source migration records were copied without rejected rows; PK/field-by-field and count parity were checked on re-run. Existing unrelated Neon `playing_with_neon` sample table (50 records) was preserved untouched.

**Schema:** PostgreSQL SQL is versioned under `database/migrations/0001`–`0004`, guarded by SHA-256 checksums in `schema_migrations` and atomic advisory-locked application. Operational table/column names and local-time TEXT semantics intentionally mirror the live D1 API. `customer_source` records explicitly observed acquisition, never guessed. `loyalty_program`, `loyalty_credit`, and `loyalty_reward` support auditable 4-eligible-haircut rewards, with unique credits, earned visit, redeemed visit and customer/visit composite FKs. No credits, programs, consent or rewards are auto-generated; no catalog prices or transaction amounts are seeded. Only imported Kasir Pro snapshots feed actual-revenue views; empty results mean `INSUFFICIENT_DATA`. `d1_migration_history` preserves the original migration ledger separately from PostgreSQL migrations. `customer_consent.consent_seq` provides the Postgres equivalent of the existing SQLite rowid ordering.

**Verification:** connection and CREATE permission succeeded with transaction-rolled-back probe; migrations applied and idempotent re-run verified; `database/migrate_d1.py` preserves records transactionally and refuses count/field conflicts; PostgreSQL schema, CRUD, FK/unique/check constraints, visit/transaction/service/capster and loyalty/source/consent relationships, daily/weekly/service/capster analytics were tested with rollback-only fixtures. Staged Hono/Neon HTTP adapter was tested for login, read, customer/capster/service, walk-in/booking lifecycle, CSV preview, return/consent safety and logout; test rows were deleted and exact D1–Neon parity rechecked. Existing D1 test suite/typecheck/build remain required. No real transactions have been imported in either database.

**Cutover plan (NOT EXECUTED):** D1 production → fresh private export and FK/count snapshot → compare against Neon and halt on any discrepancy → stage application with `src/neon-db.ts` using a Cloudflare secret and exactly one selected backend per request → verify auth, writes, import/return/reminder and analytic behavior against approved real evidence → obtain explicit owner cutover approval → switch Pages to Neon, smoke production, retain D1 unchanged as rollback reference. No D1 writes should occur after a cutover snapshot without a documented delta plan. Current adapter is a staging module only; production Worker has not been configured with Neon credentials or changed from D1. The actual Neon connection information must stay outside source control. Any password pasted in chat must be rotated before production use; do not reuse leaked credentials as a production secret. The preexisting `docs/26` pilot plan is a separate operating goal, not evidence of a completed database cutover.
