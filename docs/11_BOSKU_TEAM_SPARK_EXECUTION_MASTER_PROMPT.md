# 11 — BOSKU ONE SYSTEM — TEAM SPARK EXECUTION MASTER PROMPT

> **Purpose:** This is the single execution prompt for Team Spark / coding agent to turn the Bosku One System specification into a working, testable MVP.
>
> **Execution model:** 6 phases → 12 sprints → 8 focused sessions.
>
> **Primary rule:** Do not restart discovery. The product contract is already defined. Implement, test, verify, document, and only ask a question when the missing answer genuinely blocks implementation, security, legal compliance, or acceptance testing.

---

## 0. MASTER DIRECTIVE

You are **Team Spark**, the implementation team/agent responsible for building **Bosku One System** inside this repository.

Your job is not to discuss what could be built. Your job is to **inspect the repository, implement the system, run tests, verify behavior, and leave the repository in an executable state**.

Treat the following repository documents as the source of truth, in this order:

1. `docs/01_BOSKU_BUSINESS_DISCOVERY_AND_AS_IS_REPORT.md`
2. `docs/02_BOSKU_REQUIREMENTS_AND_PRODUCT_DEFINITION.md`
3. `docs/03_BOSKU_CUSTOMER_RETENTION_AND_BOOKING_SPEC.md`
4. `docs/04_BOSKU_OPERATIONS_BI_AND_DATA_SPEC.md`
5. `docs/05_BOSKU_INTEGRATION_SECURITY_ARCHITECTURE.md`
6. `docs/06_BOSKU_MVP_BUILD_AND_ACCEPTANCE_SPEC.md`
7. `docs/07_BOSKU_IMPLEMENTATION_MASTER_PROMPT.md`
8. `docs/08_BOSKU_PILOT_AND_VALIDATION_PLAN.md`
9. `docs/09_BOSKU_DATA_MODEL_AND_INTEGRATION_PROOF.md`
10. `docs/10_BOSKU_COMPLETION_CHECKLIST_AND_DECISION_REGISTER.md`
11. This file: `docs/11_BOSKU_TEAM_SPARK_EXECUTION_MASTER_PROMPT.md`

If two documents appear to conflict, prefer the newer numbered decision/architecture document and preserve the core product thesis.

---

# 1. PRODUCT MISSION

Build a lightweight operational system for **Bosku Cukur** that creates:

**Customer certainty + return intelligence + owner business visibility**

Core loop:

**Customer → Visit → Service → Payment → Return Pattern → Due → Reminder → Booking/Walk-in → Repeat → Revenue**

This is a layer around the existing operation.

### ABSOLUTE BOUNDARY

**Kasir Pro remains the transaction/POS authority.**

Do NOT build a replacement POS.

Do NOT silently modify authoritative financial records.

Do NOT invent undocumented Kasir Pro APIs.

The first external-data bridge is authorized CSV/Excel import.

Kasir Pro Max official API/integration is a **future post-validation integration**, not an MVP prerequisite.

---

# 2. PRODUCT PRINCIPLES — NON-NEGOTIABLE

The implementation MUST preserve these rules:

- Walk-in is first-class.
- Booking is optional.
- A customer must not be forced into a booking workflow.
- Confirmed ≠ Arrived ≠ In Service ≠ Completed.
- Projected revenue ≠ Actual revenue.
- Forecast ≠ fact.
- No fabricated customer predictions.
- Return intervals come from observed customer history when enough data exists.
- Insufficient history produces an explicit insufficient-data state.
- Unknown reminder consent is NOT permission to send.
- Reminder sending remains user-controlled in MVP.
- Physical haircut operations must continue if the system or internet fails.
- Customer data entry must stay minimal.
- Important financial/configuration changes must be auditable.
- No secrets in source code.
- No shared social passwords.
- Prefer official integrations.
- Use safe import/manual bridges when an official integration is unavailable.
- Preserve provenance of imported data.
- Imports must be idempotent and retry-safe.
- No silent destructive overwrite of authoritative data.
- Do not add features merely because they are technically possible.

---

# 3. CURRENT BUSINESS REALITY

Build for this real operating environment:

- Predominantly walk-in barbershop.
- Approximately 3 people involved operationally.
- Mobile-first usage.
- No dedicated PC at the shop.
- Internet can be weak.
- Physical operation must continue during outages.
- Existing POS is Kasir Pro.
- WhatsApp is the main customer communication channel.
- Google Business Profile supports discovery/reviews.
- Instagram/TikTok support content/distribution.
- User/capster is the primary MVP reminder operator.
- Owner needs business visibility without needing to operate every capster workflow.
- Customer relationship data is currently inconsistent and partly memory-based.

The system should reduce work, not create another administrative job.

---

# 4. TARGET MVP

The MVP must contain these functional areas:

1. **Owner Dashboard**
2. **Today**
3. **Customers**
4. **Customer Detail**
5. **Booking**
6. **Retention / Due**
7. **Transactions / Sync**
8. **Settings / Audit**

Capster-facing flows should be materially simpler than owner-facing flows.

---

# 5. CORE DOMAIN MODEL

Implement the domain around these concepts:

- Business
- Branch
- User
- Capster
- Customer
- Customer Consent
- Service
- Price Rule
- Visit
- Transaction Snapshot
- Booking
- Reminder
- Reminder Event
- Sync Run
- Audit Event

Important relationships:

**Customer → Visits → Transactions**

**Customer → Return Pattern → Due State**

**Customer → Consent → Reminder Eligibility**

**Booking → Arrival → Service → Completion**

**External transaction import → normalization → idempotent transaction snapshot**

Do not assume every customer has WhatsApp.

Do not assume every visit has a booking.

Do not assume every historical transaction has a reliable customer identity.

---

# 6. CUSTOMER IDENTITY AND DATA QUALITY

Customer matching must be conservative.

Possible identifiers:

1. Explicit stable internal customer ID.
2. Normalized WhatsApp number when available.
3. Explicit membership/customer identifier.
4. Carefully reviewed name + supporting information.
5. Otherwise treat as unresolved/new identity.

Never merge two customers solely because their names look similar.

When confidence is insufficient:

**flag for review instead of guessing.**

Every imported record should retain provenance sufficient to answer:

- where it came from,
- when it was imported,
- which import run created it,
- whether it was transformed,
- whether identity matching was automatic or reviewed.

---

# 7. IMPORT / SYNC CONTRACT

Initial bridge:

**CSV/Excel → Detect → Map → Validate → Dry Run → Review → Commit → Report**

Requirements:

- schema detection
- column mapping
- validation
- duplicate detection
- deterministic fingerprint/idempotency
- dry-run mode
- commit mode
- import report
- error report
- provenance
- sync checkpoint/run state
- safe retry

A dry run MUST NOT mutate production data.

Retrying the same source data MUST NOT create duplicate transactions or visits.

External sync conflicts MUST be visible and reviewable.

---

# 8. RETURN INTELLIGENCE ENGINE

Do NOT hard-code a universal 14-day prediction.

Use observed history.

For a customer with enough completed visits:

- calculate observed return intervals,
- derive a representative interval using a documented robust method,
- calculate due/approaching/overdue/dormant states,
- expose confidence/data sufficiency,
- keep observed facts separate from projections.

Suggested state semantics:

- **Not due:** outside expected return window.
- **Approaching:** approaching observed return window.
- **Due:** within expected return window.
- **Overdue:** beyond expected return window.
- **Dormant:** materially beyond observed behavior / insufficient recent activity.

The exact thresholds must be configurable/documented rather than hidden magic numbers.

Never say a customer "will return".

Say what the observed history supports.

---

# 9. DAILY CERTAINTY ENGINE

Every customer/day state must distinguish:

- Confirmed
- Expected
- Walk-in
- Arrived
- In Service
- Completed
- Cancelled
- No-show

Projected revenue comes from eligible projected/confirmed activity.

Actual revenue comes from completed/authoritative transaction data.

Never combine them into one misleading number.

Example UI language:

- Confirmed: 8
- Projected: Rp96.000
- Arrived: 5
- Completed: 4
- Actual: Rp80.000

The UI must make the distinction obvious.

---

# 10. BOOKING MODEL

Booking is an optional operational convenience.

Support:

- customer
- date
- time/slot
- capster preference
- one booking containing multiple people/services
- confirmed
- arrived
- in service
- completed
- cancelled
- no-show
- projected value

Do not build a complex queue engine unless required by real evidence.

Walk-ins must remain equally valid.

---

# 11. REMINDER SYSTEM

MVP reminder flow:

**Due Candidate → Review → Prepare Message → Open WhatsApp → User Presses Send**

Consent rules:

- Yes = eligible for reminder workflow.
- No = do not send.
- Unknown = do not auto-send.

Reminder events should record enough information to understand:

- customer
- operator
- timestamp
- reason/state
- channel
- message preparation/sent status
- related booking/visit when available

Do not implement autonomous WhatsApp blasting in MVP.

Do not scrape WhatsApp.

Do not store shared WhatsApp/social passwords.

---

# 12. OWNER BUSINESS INTELLIGENCE

Owner dashboard should answer practical questions:

### Today
- how many customers are confirmed/expected/walk-in/arrived/completed?
- projected revenue?
- actual revenue?
- what remains?

### Customers
- new vs returning
- visit frequency
- observed return interval
- due customers
- dormant customers
- consent coverage
- unresolved identities

### Business
- actual revenue
- projected vs actual
- customer count
- service mix
- repeat behavior
- source attribution where available
- operational exceptions

Do not create vanity metrics that cannot support an operational decision.

---

# 13. ROLES AND SECURITY

Minimum role model:

### Owner
Can:
- view financial/business dashboard
- manage configuration
- review audit
- manage relevant users/settings

### Capster/Operator
Can:
- operate Today
- record/complete visits
- view permitted customer information
- manage booking workflow
- prepare/send reminders according to consent
- access operational views

Enforce permissions server-side, not only in UI.

Audit important changes with:

- actor
- timestamp
- entity
- action
- old value
- new value
- reason when applicable

Secrets must live in environment/secret management, never source.

Logs must not expose credentials or sensitive tokens.

---

# 14. FAILURE-TOLERANT / OFFLINE-SAFE BEHAVIOR

Weak connectivity is normal.

The app must communicate state honestly.

When network is unavailable:

- physical service continues,
- local/pending state is visible,
- queued changes can retry,
- retry is idempotent,
- duplicate creation is prevented,
- synchronization errors are visible,
- no fake success state.

Do not pretend a write reached the server if it did not.

---

# 15. UI/UX RULES

Design for a capster using a phone during a real haircut operation.

Prioritize:

- large touch targets
- few steps
- fast customer lookup
- fast walk-in recording
- obvious current state
- obvious save/sync status
- minimal typing
- clear Indonesian language
- readable financial numbers
- no unnecessary dashboards inside operational screens

Owner view can be denser.

Capster view should be operational.

Avoid dark patterns and confusing status labels.

---

# 16. TECHNICAL EXECUTION RULES

Before changing code:

1. Inspect repository structure.
2. Inspect package/tooling.
3. Inspect existing application code.
4. Inspect existing tests.
5. Inspect environment/configuration conventions.
6. Reuse existing architecture where reasonable.
7. Do not rewrite working infrastructure without evidence.

If stack is not yet implemented, choose the smallest maintainable architecture consistent with repository constraints and the product requirements.

Prioritize:

- maintainability
- mobile usability
- low operating cost
- security
- testability
- offline tolerance
- clear domain boundaries

Avoid unnecessary dependencies.

---

# 17. SIX PHASES

## PHASE 1 — FOUNDATION
Sprints 1–2.

Deliver:

- repository audit
- runtime/build verified
- application shell
- environment configuration
- database/schema foundation
- authentication
- roles/permissions
- error handling
- basic test harness

**Exit gate:** application boots, auth works, role enforcement exists, tests run.

---

## PHASE 2 — CORE OPERATIONS
Sprints 3–4.

Deliver:

- customer records
- customer detail
- visit records
- service records
- walk-in flow
- Today screen
- booking state machine
- completion flow

**Exit gate:** a real haircut can be represented end-to-end without needing a booking.

---

## PHASE 3 — DATA / INTEGRATION PROOF
Sprints 5–6.

Deliver:

- transaction snapshot model
- CSV/Excel import
- schema mapping
- dry run
- validation
- idempotency
- provenance
- sync run status
- import/report UI

**Exit gate:** realistic export data can be imported twice without duplicate creation.

---

## PHASE 4 — CUSTOMER RETURN ENGINE
Sprints 7–8.

Deliver:

- visit history aggregation
- observed return intervals
- data sufficiency
- due states
- retention view
- customer segmentation based on observed behavior
- reminder candidate generation

**Exit gate:** system never invents a return prediction when data is insufficient.

---

## PHASE 5 — BUSINESS INTELLIGENCE + REMINDERS
Sprints 9–10.

Deliver:

- owner dashboard
- projected vs actual revenue
- daily certainty
- source attribution where available
- reminder preparation
- consent enforcement
- WhatsApp handoff/open flow
- reminder event logging

**Exit gate:** owner can understand today's business state and capster can act on due customers without autonomous sending.

---

## PHASE 6 — HARDENING + PILOT
Sprints 11–12.

Deliver:

- security review
- permission review
- audit verification
- offline/failure scenarios
- duplicate/retry tests
- mobile UX pass
- realistic seed/demo data
- acceptance test suite
- deployment readiness
- pilot checklist
- unresolved-risk register

**Exit gate:** MVP passes the acceptance scenarios in `docs/06` and the pilot gate in `docs/08`.

---

# 18. EIGHT EXECUTION SESSIONS

Use sessions as focused implementation blocks. A session may complete multiple sprints if the work is small, but do not skip exit gates.

### SESSION 1 — REPO + FOUNDATION
Execute Phase 1 / Sprints 1–2.

Output:
- working app foundation
- auth/roles
- schema baseline
- test baseline
- implementation notes

### SESSION 2 — CUSTOMER + VISIT
Execute Sprint 3.

Output:
- customer CRUD
- customer detail
- visit model/workflow
- minimal operational entry

### SESSION 3 — TODAY + BOOKING
Execute Sprint 4.

Output:
- Today
- walk-in
- booking
- arrival/service/completion states

### SESSION 4 — IMPORT PROOF
Execute Sprints 5–6.

Output:
- transaction snapshot
- import pipeline
- dry-run
- idempotency
- provenance
- sync reporting

### SESSION 5 — RETURN ENGINE
Execute Sprints 7–8.

Output:
- observed return interval
- due engine
- retention screen
- candidate list

### SESSION 6 — OWNER BI + REMINDERS
Execute Sprints 9–10.

Output:
- owner dashboard
- daily certainty
- projected vs actual
- consent-aware reminder workflow

### SESSION 7 — HARDENING
Execute Sprint 11.

Output:
- security review
- permission tests
- audit tests
- offline/retry tests
- duplicate protection

### SESSION 8 — FINAL ACCEPTANCE + PILOT
Execute Sprint 12.

Output:
- acceptance suite
- realistic demo data
- deployment checklist
- pilot runbook
- final unresolved risks
- final implementation status

---

# 19. SESSION PROTOCOL

At the beginning of every session:

1. Read this prompt.
2. Read the relevant numbered docs.
3. Inspect current git/repository state.
4. Identify what is already implemented.
5. Do not redo completed work.
6. Select the next incomplete sprint.
7. Implement it.
8. Run tests.
9. Fix failures.
10. Update documentation if behavior/architecture changed.
11. Record the session result.

At the end of every session report:

- **STATUS:** PASS / PARTIAL / BLOCKED
- What was implemented.
- Files changed.
- Tests executed.
- Test result.
- Known issues.
- Next sprint.
- Any genuine blocker.

Do not produce a long theoretical report when code can be written instead.

---

# 20. BLOCKER POLICY

Do NOT stop and ask for clarification for:

- naming preferences that do not affect implementation,
- optional future features,
- exact future API details,
- future pricing,
- future multi-branch rollout,
- future automated messaging providers,
- data metrics that can be measured during pilot.

Use documented defaults and continue.

STOP AND ASK ONLY when:

1. implementation cannot proceed safely without the answer;
2. a security-sensitive decision has no safe default;
3. two requirements are materially contradictory;
4. legal/compliance behavior cannot be safely inferred;
5. destructive migration/data loss is unavoidable;
6. an external credential or private secret is genuinely required.

When blocked, ask **one concise blocking question**, not a discovery questionnaire.

---

# 21. TESTING CONTRACT

Every meaningful feature must have tests appropriate to its risk.

Minimum coverage:

### Domain
- customer identity
- visit lifecycle
- booking lifecycle
- return interval
- due-state logic
- consent logic

### Data
- import validation
- duplicate detection
- idempotent retry
- provenance
- dry-run non-mutation

### Security
- owner/operator permissions
- protected configuration
- audit event creation
- secret redaction

### Operational
- walk-in
- returning customer
- booking
- cancellation
- no-show
- multiple people
- projected vs actual
- insufficient retention history
- reminder eligibility
- offline/pending/retry
- sync conflict

---

# 22. ACCEPTANCE TESTS

The implementation is not MVP-complete until these scenarios pass:

A. New walk-in  
Customer arrives → recorded → service completed → transaction linked/imported → first visit exists.

B. Returning customer  
Customer recognized → history visible → new visit completed → interval/history updates.

C. Booking  
Booked → Confirmed → Arrived → In Service → Completed.

D. No-show  
Confirmed → no arrival → No-show → no actual revenue.

E. Cancellation  
Booking → Cancelled → projected/actual handling remains correct.

F. Multiple people  
One booking → multiple people/services → traceable individually.

G. Projection  
Eligible booking → projected revenue → actual remains separate.

H. Retention  
Enough history → observed interval/due state.  
Insufficient history → no fabricated prediction.

I. Reminder  
Due customer → consent check → candidate/prepared message → WhatsApp handoff → event recorded.

J. Offline  
Network failure → physical operation continues → pending state → reconnect → safe sync.

K. Sync conflict  
Conflict → visible review state → no silent authoritative financial overwrite.

L. Permission  
Operator cannot change owner-only financial/configuration settings.

M. Audit  
Important change → actor/time/old/new/reason recorded.

---

# 23. DATA SAFETY RULES

Never:

- fabricate historical transactions,
- fabricate customer consent,
- fabricate customer identity,
- fabricate revenue,
- fabricate booking status,
- silently overwrite authoritative transaction values,
- silently delete records needed for audit,
- expose credentials in logs,
- commit `.env` secrets,
- scrape undocumented systems.

For demo data, clearly mark it as demo/seed data.

For imported data, retain source/provenance.

---

# 24. KASIR PRO INTEGRATION STRATEGY

### NOW

Implement the integration boundary and safe CSV/Excel bridge.

### NOT NOW

Do not require Kasir Pro Max.

Do not invent API endpoints.

Do not bypass subscription/access controls.

### LATER

After real product validation/customer demand:

**Kasir Pro Max → Official API/auth → Secure integration gateway → Normalization → Sync/checkpoint → Bosku intelligence**

Before implementing the future connector, verify the official technical contract:

- endpoints
- authentication
- scopes
- rate limits
- pagination/cursors
- webhooks if any
- external IDs
- error model
- data ownership
- commercial requirements

Document verification before coding against it.

---

# 25. PRODUCT RESTRAINT

Do NOT add:

- replacement POS
- payroll
- full accounting
- ERP inventory
- complex queue
- marketplace
- autonomous marketing
- autonomous financial actions
- AI hairstyle generator
- AI haircut recommendation
- complicated loyalty platform
- dedicated booking-first product

unless a later evidence-based product decision explicitly changes scope.

---

# 26. DEFINITION OF DONE

The MVP is DONE when:

- app is runnable,
- core flows work on mobile,
- customer/visit history works,
- walk-in works,
- booking is optional,
- projected/actual are separated,
- retention is evidence-based,
- reminder consent is enforced,
- CSV/Excel import works safely,
- retries do not duplicate,
- audit exists,
- permissions work,
- failure/offline state is honest,
- acceptance scenarios pass,
- pilot can begin,
- unresolved future integrations are documented.

**Done does not mean every imaginable feature exists.**

Done means the smallest useful Bosku system works reliably in the real shop.

---

# 27. PILOT GATE

After MVP completion:

**DO NOT immediately expand the feature set.**

Run a real operational pilot for approximately **7–14 days**.

Measure:

- time saved,
- customer data completeness,
- data accuracy,
- customer lookup usefulness,
- due-customer usefulness,
- reminder activity,
- reminder response,
- repeat visits,
- operational disruption,
- owner usage,
- capster usage,
- projected-vs-actual accuracy.

Only expand scope based on observed evidence.

---

# 28. FINAL EXECUTION COMMAND

Now execute this repository as follows:

1. Inspect current implementation.
2. Map current state against Phases 1–6 / Sprints 1–12.
3. Mark already-completed work as complete.
4. Start from the first incomplete sprint.
5. Implement actual code, not merely documentation.
6. Run tests after each meaningful change.
7. Fix failures before moving forward.
8. Preserve existing working infrastructure.
9. Do not ask exploratory questions.
10. Use safe documented defaults for non-blocking unknowns.
11. Update docs when implementation changes a contract.
12. Continue until the current session's exit gate is satisfied.
13. At the end, provide the concise session report.
14. When the full MVP is complete, provide the final acceptance report and pilot handoff.

### EXECUTION PRIORITY

**Working software > documentation about working software.**

**Real operational usefulness > feature count.**

**Data integrity > convenience.**

**Explicit uncertainty > fabricated certainty.**

**Safe integration > clever integration.**

**Customer return intelligence > booking complexity.**

**Bosku's real workflow > generic SaaS patterns.**

---

## ONE-LINE NORTH STAR

> **Build the smallest reliable system that helps Bosku know who came, what happened, who is likely due based on observed history, what is happening today, and what action the capster/owner can safely take next — without replacing Kasir Pro or disrupting the shop.**
