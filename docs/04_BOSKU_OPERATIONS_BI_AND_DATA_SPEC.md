# 04 — OPERATIONS, BI & DATA SPEC

## 1. Daily operating flow
### Opening
1. Clean
2. Tidy
3. Check tools
4. Check electricity/TV/fan
5. Prepare station
6. Mark system ready

### Customer arrival
Event-driven; no assumed arrival schedule.

### Service
Consult → haircut/service → finish → optional wash/extra service → content capture with permission where appropriate.

### Payment
Payment → Kasir Pro transaction → customer leaves.

### Closing
Clean → tidy → turn off equipment → cash count → reconcile → daily report.

## 2. Operational dashboard
Today:
- date
- opening status
- confirmed bookings
- arrivals
- in service
- completed
- cancellations/no-shows
- walk-ins
- projected revenue
- actual revenue
- projection vs actual gap

## 3. Owner dashboard
Core:
1. Customers
2. Revenue
3. Retention
4. Booking
5. Acquisition
6. Service mix
7. Capster performance
8. Branches later

Avoid vanity metrics.

## 4. KPI definitions
### New Customers
Unique customers whose first recorded visit falls in the selected period.

### Repeat Rate
Customers with >=2 recorded visits divided by customers with sufficient observation/history according to the selected reporting definition.

### Visit Interval
Time between consecutive completed visits for the same customer.

### Actual Revenue
Authoritative completed transaction amount imported from Kasir Pro.

### Projected Revenue
Sum of eligible confirmed booking values under the configured projection rule.

### Confirmed → Arrived Rate
Arrived bookings / confirmed bookings for completed reporting windows.

### Booking → Completed Rate
Completed bookings / confirmed bookings, with cancellation/no-show rules explicitly documented.

### Revenue per Customer
Actual revenue / unique completed customers in the same reporting period.

## 5. Data entities
Core:
- Customer
- Visit
- Service
- Booking
- BookingPerson
- Transaction
- Membership
- Reminder
- AcquisitionSource
- Capster
- Branch
- AuditEvent

Optional/later:
- ContentItem
- StockItem
- Campaign

## 6. Data authority
Primary transaction authority: **Kasir Pro**

System-derived intelligence: **Bosku One System**

If imported transaction data conflicts with manually entered revenue, flag the conflict instead of silently overwriting authoritative revenue.

## 7. Data quality
Important external records should support:
- source
- source_reference
- imported_at
- last_synced_at
- sync_status
- quality marker where relevant

## 8. Offline behavior
Physical operations continue if internet fails.

Local actions may be queued for sync. UI clearly shows:
- online
- offline
- pending sync
- sync failed
- synced

No financial record may be silently lost.

## 9. Audit events
Audit at minimum:
- price changes
- discount changes
- booking status overrides
- customer merge/unmerge
- manual revenue adjustment
- permission changes
- integration configuration changes
- reminder automation changes

## 10. Multi-branch readiness
Branch is a first-class data dimension even if MVP has one branch.

Future:
Owner → Branch 1 / Branch 2 / Branch 3 → customers → revenue → retention → capster.

Do not implement complex branch operations before a second branch exists.
