# BOSKU DATA MODEL AND INTEGRATION PROOF

**Status:** MVP implementation-ready  
**Date:** 2026-09-27

## 1. Purpose

This document locks the minimum data model and safe integration-proof strategy.

Bosku is built independently from paid KasirPro Max API access.

Strategy:
1. Build and validate Bosku privately.
2. Import realistic KasirPro CSV/Excel exports.
3. Prove customer, visit, return, booking, reminder, and daily-certainty workflows.
4. Validate usefulness in real operations.
5. Only after a real customer/deployment requires it, subscribe to the appropriate KasirPro tier and implement the official API contract.

KasirPro API details are intentionally not invented here.

## 2. Data authority

| Domain | Authority |
|---|---|
| Transaction/payment source | KasirPro |
| Imported transaction snapshot | Bosku, with source provenance |
| Customer relationship/return intelligence | Bosku |
| Booking | Bosku |
| Reminder workflow | Bosku |
| Consent record | Bosku |
| Service/pricing reference | Bosku for intelligence; KasirPro remains transaction authority |
| Audit trail | Bosku |
| Final financial reconciliation | KasirPro |

Bosku must not silently rewrite historical financial facts.

## 3. Core entities

### business
id, name, timezone, currency, status, created_at, updated_at.

### branch
id, business_id, name, address, timezone, status, created_at, updated_at.

MVP may use one branch, but the model must not hard-code single-branch architecture.

### user
id, business_id, display_name, role, phone, status, created_at, updated_at.

Roles: owner, manager/operator, capster, viewer.

### capster
id, branch_id, user_id nullable, display_name, status, created_at, updated_at.

### customer
id, branch_id, external_customer_id nullable, name nullable, whatsapp nullable, normalized_whatsapp nullable, age_or_group nullable, occupation_or_school nullable, address_or_village nullable, first_seen_at, last_visit_at, status, created_at, updated_at.

Only collect fields that create clear operational value.

### customer_consent
id, customer_id, channel, purpose, status, captured_at, captured_by, source, notes nullable.

Consent status: yes / no / unknown.

For WhatsApp reminders, unknown is not equivalent to yes.

### service
id, branch_id, name, category nullable, active, created_at, updated_at.

### price_rule
id, branch_id, service_id, price, effective_from, effective_to nullable, source, created_at.

Historical transactions preserve their observed amount even after price changes.

### visit
id, branch_id, customer_id nullable, capster_id nullable, booking_id nullable, occurred_at, status, service_summary nullable, source, external_visit_id nullable, created_at, updated_at.

Statuses: expected, arrived, in_service, completed, cancelled, no_show.

Walk-ins are first-class visits.

### transaction_snapshot
id, branch_id, visit_id nullable, external_transaction_id nullable, transaction_time, gross_amount nullable, payment_method nullable, service_text nullable, capster_text nullable, source_system, source_file_id nullable, source_row_number nullable, imported_at, raw_fingerprint, reconciliation_status.

This is an imported snapshot, not a replacement POS ledger.

### booking
id, branch_id, customer_id nullable, booked_by, scheduled_start, scheduled_end nullable, party_size, preferred_capster_id nullable, status, notes nullable, created_at, updated_at.

One booking can represent multiple people.

### reminder
id, branch_id, customer_id, visit_id nullable, due_at, eligibility_status, consent_status, channel, message_draft nullable, sent_at nullable, outcome nullable, created_at, updated_at.

Reminder generation does not automatically imply sending.

### reminder_event
id, reminder_id, event_type, occurred_at, actor_user_id nullable, metadata, created_at.

Example events: candidate_created, reviewed, dismissed, send_intent, sent, replied, booked, returned.

### sync_run
id, branch_id, source_system, source_type, started_at, completed_at, status, rows_seen, rows_imported, rows_skipped, rows_rejected, error_summary nullable, created_by.

### audit_event
id, branch_id, actor_user_id nullable, action, entity_type, entity_id, occurred_at, before_snapshot nullable, after_snapshot nullable, metadata.

Audit important changes such as price, role, consent, booking, and integration configuration changes.

## 4. Customer identity and deduplication

Identity matching must be conservative.

Preferred signals:
1. stable external customer ID;
2. normalized WhatsApp;
3. exact name plus supporting context;
4. manual review for ambiguity.

Never merge customers solely because their names look similar.

Every imported record retains provenance.

## 5. CSV/Excel integration proof

Input: exported KasirPro CSV or Excel.

Importer stages:

**Upload → Detect → Map → Validate → Dry Run → Review → Commit → Report**

The importer must show:
- detected columns;
- proposed mapping;
- unmapped columns;
- invalid rows;
- duplicate candidates;
- date/time interpretation;
- monetary parsing;
- customer identity matches;
- affected record counts.

### Dry run

No production data is mutated during dry run.

Report:
- rows read/valid/invalid;
- new and matched customers;
- ambiguous customers;
- transactions and visits;
- duplicates;
- missing WhatsApp;
- missing customer names;
- unmapped services;
- date range;
- total observed transaction value.

### Commit

Only explicit user action may commit.

Repeatedly importing the same file must not create duplicate visits or transactions. Use external transaction IDs where available; otherwise use a deterministic fingerprint from source file identity plus stable row/content fields.

## 6. Return intelligence

Bosku calculates observed behavior from actual visits.

Do not hard-code a universal 14-day return cycle.

Derived values:
- visit_count;
- first_visit_at;
- last_visit_at;
- observed_intervals;
- median_return_interval;
- recent_return_interval;
- expected_due_at;
- days_since_last_visit;
- due_state.

Example due states:
- not_due;
- approaching;
- due;
- overdue;
- dormant.

These are analytical states, not promises.

## 7. Daily certainty

Keep these separate:

- **Confirmed:** explicit booking/commitment.
- **Expected:** system expectation based on evidence.
- **Walk-in:** not known in advance.
- **Actual:** customer who actually arrived/completed a visit.

Never display projected revenue as actual revenue.

Minimum daily metrics:
confirmed customers, expected customers, completed customers, walk-ins, cancelled, no-show, projected revenue, actual revenue, variance.

## 8. Reminder policy

Reminder candidates use observed return behavior plus consent.

- Consent = No → do not send.
- Consent = Unknown → do not auto-send.
- Consent = Yes → eligible for human review/send workflow.

MVP UX:

**Candidate → Review → Prepare message → Open WhatsApp → User presses Send**

No silent WhatsApp sending.

## 9. Future KasirPro Max API integration

Future boundary:

**KasirPro Max → Official API/auth → Bosku integration gateway → Normalization → Sync/checkpoint → Customer/visit intelligence**

Before production implementation, verify official KasirPro information for:
- exact plan/API availability;
- authentication and scopes;
- endpoints;
- customer/transaction access;
- pagination;
- rate limits;
- webhooks/events;
- errors;
- sandbox;
- commercial terms;
- privacy/data-retention requirements.

Until verified, all of these remain TBD.

## 10. Security

- secrets outside source;
- least-privilege credentials;
- encrypted transport;
- server-side validation;
- role-based access;
- audit trail;
- idempotent import/sync;
- retry with backoff;
- no silent financial mutation;
- safe credential revocation;
- sensitive-log redaction;
- no API keys/passwords in source.

## 11. MVP completion gate

Ready when:
- realistic CSV/Excel imports safely;
- dry run works;
- duplicate protection works;
- customer matching is explainable;
- provenance is retained;
- return intervals are calculated from real data;
- projected vs actual metrics are separate;
- reminder candidates respect consent;
- WhatsApp sending remains user-controlled;
- important mutations are audited;
- import failure cannot corrupt existing data.

## 12. Explicit non-goals

Do not build yet:
- replacement POS;
- undocumented KasirPro scraping;
- automatic WhatsApp blasting;
- full accounting;
- payroll;
- complex queue management;
- automatic KasirPro price mutation;
- AI haircut recommendations;
- marketplace;
- mandatory booking-first UX.

## Phase 2 implementation detail (2026-09-27)

Migration `0002_core_operations.sql` extends the foundation without deleting existing rows:

- `visit.service_id` optionally points to configured `service`; `visit.booking_person_id` identifies the booked person (unique when present). Walk-ins have `booking_id`/`booking_person_id` null.
- `booking_person` holds one row per person, with optional explicit `customer_id`, `service_id`, `capster_id` and a nullable `projected_unit_value` snapshot. Only the first person inherits the booking's primary customer ID; no identity is guessed for other people.
- The booking's `projected_value` is the sum of snapshots only when all listed people have configured prices. If any price is missing, the total is null and the daily summary marks the projection incomplete. Changes to service/price do not rewrite booking snapshots.
- `price_rule` is versioned: replacing a price closes the active rule and creates a new one in the same D1 batch, with an audit event. This reference is **not** Kasir Pro payment truth.
- Customer, walk-in, and booking create requests use caller-generated UUID + canonical request hash for same-payload retry; a reused ID with different payload is rejected. Offline queueing is not yet implemented.
- A booking starts `confirmed`, creates one visit per person on transition to `arrived`, then advances through `in_service` and `completed`, or terminates as `cancelled`/`no_show`. Walk-in begins `arrived` without booking. Completion updates observed customer visit dates; it never generates actual revenue.
- `GET /api/today` aggregates operational statuses by business-local date (`Asia/Jakarta`). Projected revenue includes only active confirmed/arrived/in-service bookings; actual remains null until authoritative Kasir Pro snapshots exist.
- Owner bootstrap without an environment secret is restricted to local HTTP loopback and first-owner-only; public/production setup remains secret-gated. No user-supplied token is needed for local Phase 2 development.

## Phase 3 implementation detail (2026-09-27)

Migration `0003_import_retention.sql` adds optional customer link, customer/source reference fields, unique external transaction ID per branch/source, and reminder/consent lookup indexes. The Phase 3 importer processes owner-provided CSV only (no Kasir Pro API calls). It performs a read-only preview and atomically commits valid, non-conflicting new snapshots together with a `sync_run` checkpoint and audit entry. Duplicate external IDs with differing contents are conflicts; without an ID, hash of file contents plus row number is used for retry of the *same* file. No customer is created or joined on name alone: only exact normalized WhatsApp matching attaches an active existing customer. No visit is created from an imported transaction. Revenue marked actual means imported CSV snapshot, not external reconciliation.

`GET /api/returns` uses completed visits only, after collapsing multiple services on the same calendar date. Three distinct days are required for two observed intervals. Median of up to five recent intervals gives a next-return window of +/- max(2 days, ceil(20% of median)); `due_soon` begins one half-width before that window. This rule is a conservative product default to validate during the pilot, not a measured customer-specific certainty. A customer with missing/insufficient history is labeled accordingly. Only explicit customer consent `yes` unlocks preparation and manual WhatsApp handoff; revoked consent blocks an existing prepared reminder. No server endpoint sends messages.

Production D1 `bosku-one-system-db` is dedicated and migrated through 0003. CF BYOK Pages is deployed at `https://bosku-one-system.pages.dev`; public smoke and unauthorized access check passed. The first owner has not yet been created, so authenticated production business workflows remain pending verification. See `docs/10_BOSKU_COMPLETION_CHECKLIST_AND_DECISION_REGISTER.md`.

## 13. Operating principle

**Build the smallest reliable layer that turns existing transaction history into customer certainty and repeat-business action.**

KasirPro remains the transaction system of record. Bosku becomes the intelligence and relationship layer around it.
