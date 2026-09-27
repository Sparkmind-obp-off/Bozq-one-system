# 02 — BOSKU REQUIREMENTS & PRODUCT DEFINITION

## 1. Product definition
**Working name:** Bosku One System

A lightweight operating intelligence layer for Bosku Cukur that connects customer history, daily certainty, retention actions, and owner-level business visibility while leaving haircut operations human-led and Kasir Pro as the transaction system.

## 2. Product principles
1. Real data over guesses.
2. Walk-in is first-class.
3. Booking is optional.
4. Do not replace working tools.
5. Do not add customer-facing friction.
6. Physical work remains human.
7. Digital repetition should be automated where safe.
8. Projected and actual numbers are separate.
9. Offline/failure must not stop the shop.
10. Every important financial/configuration change is auditable.

## 3. Primary users
### Owner
Business visibility, customer/retention insight, controls, reports, and branch readiness.

### Capster
Fast operational customer view, booking visibility, history, and reminders without administrative burden.

### Customer
Simple walk-in or WhatsApp experience, optional booking, useful reminders, easy return.

## 4. MVP functional requirements
- FR-01 Customer profile
- FR-02 Visit history
- FR-03 New vs returning
- FR-04 Daily certainty
- FR-05 Walk-in
- FR-06 Revenue projection
- FR-07 Actual revenue
- FR-08 Retention intelligence
- FR-09 Reminder action
- FR-10 Booking
- FR-11 Acquisition source
- FR-12 Owner dashboard
- FR-13 Audit
- FR-14 Permissions
- FR-15 Kasir Pro sync/import boundary

## 5. Non-functional requirements
- Mobile-first
- Fast on weak connections
- Graceful offline state
- Retryable sync
- No secrets in source
- Minimal personal data
- Explicit audit trail
- Idempotent imports/sync
- Recoverable failures
- Clear status labels
- No silent revenue mutation

## 6. Product boundary
### Kasir Pro owns
- transaction entry
- POS calculation
- receipt/transaction records
- transaction-level source of truth

### Bosku One System owns
- customer intelligence
- return intelligence
- booking state
- operational visibility
- reminders
- business intelligence
- audit of its own actions

If integration is impossible, first MVP may use safe CSV/manual import rather than rebuilding POS.

## 7. Success criteria
The system should quickly answer:
1. How many customers are confirmed today?
2. How many arrived?
3. How many completed?
4. What is projected revenue?
5. What is actual revenue?
6. Which customers are due to return?
7. Which new customers came from which source?
8. What is repeat behavior?
9. What action is useful today?

## 8. Non-goals
No complex AI prediction, automatic price decisions, autonomous financial actions, full accounting, payroll, ERP inventory, or forced booking behavior.
