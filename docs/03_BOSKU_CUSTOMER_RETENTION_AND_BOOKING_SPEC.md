# 03 — CUSTOMER RETENTION & BOOKING SPEC

## 1. Purpose
Build a measurable loop that helps existing customers return without making Bosku behave like a booking-only business.

## 2. Customer lifecycle
New Customer → First Visit → Customer Profile → Return Pattern → Due Window → Reminder Opportunity → Booking or Walk-in → Repeat Visit

## 3. Customer record
Minimum fields:
- customer_id
- display_name
- phone/WhatsApp if consented
- first_seen_at
- last_visit_at
- visit_count
- preferred_capster (optional)
- common_service (derived)
- acquisition_source (optional)
- membership status (optional)
- reminder consent/status
- created_at / updated_at

Do not collect fields that do not create operational value.

## 4. Visit record
- visit_id
- customer_id
- timestamp
- capster
- service
- amount
- transaction reference
- source
- booking reference
- status

## 5. Return intelligence
Calculate:
- previous visit interval
- average/median observed interval where enough history exists
- recent interval
- next expected return window
- due
- overdue

Do not state an expected return as certainty.

Customers with insufficient history are marked **Insufficient history**, not given fabricated predictions.

## 6. Reminder states
- Not due
- Due soon
- Due
- Overdue
- Reminder prepared
- Reminder sent
- Customer responded
- Booking created
- Returned

Every automated reminder must be traceable.

## 7. Reminder policy
Default to human approval until evidence supports automation.

Example:
> “Mas, terakhir cukur di Bosku tanggal [date]. Kalau sudah waktunya rapihin lagi, Bosku buka hari ini. Mau saya booking-kan jam berapa?”

Wording must be configurable. Respect opt-out and consent requirements.

## 8. Booking
A booking contains:
- booking_id
- customer
- one or more people
- date
- requested time
- capster (optional)
- status
- created_by
- notes
- timestamps

Statuses:
Confirmed → Arrived → In Service → Completed

Terminal states:
Cancelled
No-show

## 9. Multi-person booking
One booking may represent 1, 2, 3, or more customers.

Capacity calculations must use actual capster availability and service duration once validated.

## 10. Walk-in coexistence
Walk-ins remain simple:
- record arrival
- assign capster
- serve
- complete transaction
- associate customer if known

Do not force walk-ins into a queue-ticket system.

## 11. Daily certainty
Show:
- Confirmed
- Expected, only if a forecast is explicitly enabled
- Walk-in
- Arrived
- Completed
- Cancelled
- No-show

Projected income must state exactly which categories are included.

## 12. Retention KPI
Primary:
- Repeat Rate
- Median/average observed visit interval
- Due-to-return count
- Reminder-to-return conversion

Secondary:
- Booking completion rate
- No-show rate
- New-to-repeat conversion

Do not claim retention improvement until measured against a baseline.
