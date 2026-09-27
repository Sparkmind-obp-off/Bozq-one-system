# BOSKU COMPLETION CHECKLIST AND DECISION REGISTER

**Status:** Execution baseline  
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
- [ ] CSV upload
- [ ] Excel upload if practical
- [ ] column detection
- [ ] mapping UI
- [ ] validation
- [ ] dry run
- [ ] deduplication
- [ ] provenance
- [ ] idempotent commit
- [ ] import report

### Phase D — Customer return engine
- [ ] observed intervals
- [ ] due calculation
- [ ] due states
- [ ] customer list
- [ ] customer detail
- [ ] return opportunity view

### Phase E — Booking and daily certainty
- [x] booking creation
- [x] optional capster selection
- [x] party size (per-person booking records)
- [x] status lifecycle
- [ ] confirmed/expected/walk-in/actual distinction (confirmed/walk-in/arrival/completed work; evidence-based expected remains future)
- [ ] projected vs actual revenue (projection and explicit 'actual unavailable' work; actual import awaits Phase C)

### Phase F — Reminder workflow
- [ ] consent
- [ ] reminder candidates
- [ ] message templates
- [ ] review
- [ ] WhatsApp handoff
- [ ] reminder event history

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
- [ ] CSV import works
- [ ] dry-run works
- [ ] duplicate protection works
- [ ] provenance is retained
- [ ] import errors are understandable
- [x] customer matching is conservative (explicit ID/WhatsApp only; same-name customers stay separate)
- [ ] historical transaction values are preserved (import proof pending)

### Intelligence
- [x] last visit is visible
- [ ] return intervals are calculated
- [ ] due state is visible
- [ ] reminder candidate logic works
- [ ] projected vs actual revenue is separated

### Safety
- [ ] consent state is enforced (reminder workflow pending)
- [x] no automatic WhatsApp blast
- [x] no secrets in source
- [x] audit trail works
- [x] financial mutation is blocked by default (no POS write route)
- [ ] external integration failure does not corrupt core data (import/sync pending)

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

## 11. Final operating rule

**Questions are now evidence-driven, not exploration-driven.**

If an answer is required to build safely, ask it.

If it is not required, implement with a documented default and validate during the pilot.

**Next job: execute, test, load realistic data, observe real usage, and iterate from evidence.**
