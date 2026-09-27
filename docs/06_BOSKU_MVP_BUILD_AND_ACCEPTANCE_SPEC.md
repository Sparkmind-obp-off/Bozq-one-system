# 06 — MVP BUILD & ACCEPTANCE SPEC

## 1. MVP scope
### Included
- customer profile
- visit history
- new/returning classification
- daily booking/arrival/completion view
- walk-in recording
- projected vs actual revenue
- return/due logic
- reminder preparation
- booking management
- source attribution
- owner dashboard
- roles/permissions
- audit
- import/sync boundary
- offline-safe states

### Excluded
- replacement POS
- complex queue
- payroll
- full accounting
- ERP inventory
- autonomous marketing
- autonomous financial action
- AI hairstyle features

## 2. Core screens
1. Owner Dashboard
2. Today
3. Customers
4. Customer Detail
5. Booking
6. Retention / Due
7. Transactions / Sync
8. Settings / Audit

Capster view should be simpler than owner view.

## 3. Acceptance scenarios
### A. New walk-in
Customer arrives → recorded → service completed → transaction linked/imported → first-visit record created.

### B. Returning customer
Customer recognized → prior visits visible → service completed → visit count/interval updated.

### C. Booking
Customer books → Confirmed → Arrived → In Service → Completed.

### D. No-show
Confirmed booking → no arrival → No-show; excluded from actual revenue.

### E. Cancellation
Booking → Cancelled; projected value handled according to documented rules.

### F. Multiple people
One booking contains multiple people → each service/transaction remains individually traceable.

### G. Projection
Confirmed eligible bookings produce projected revenue. Actual revenue remains independent.

### H. Retention
Customer history with enough visits produces observed interval and due window. Insufficient history produces no fabricated prediction.

### I. Reminder
Due customer → reminder prepared/sent → event logged → response/booking can be linked.

### J. Offline
Internet fails → physical service continues → local pending state → reconnect → safe sync without duplication.

### K. External sync conflict
Conflicting data → flagged for review; no silent overwrite of authoritative revenue.

### L. Permission
Capster cannot change owner-only financial/configuration settings.

### M. Audit
Important configuration/financial override → actor/time/reason/old/new values recorded.

## 4. MVP quality gates
- No critical data loss
- No silent financial mutation
- No duplicate transaction after retry
- Walk-in requires minimal input
- Dashboard distinguishes projected and actual
- Retention does not fabricate certainty
- Offline state is visible
- Owner can trace important changes

## 5. Pilot recommendation
Pilot at the real Bosku shop before broad productization.

Measure:
- reduced manual work
- daily customer visibility
- useful return opportunities
- repeat behavior
- data accuracy
- operational disruption
- actual owner usage
