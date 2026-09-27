# 01 — BOSKU BUSINESS DISCOVERY & AS-IS REPORT

**Status:** Discovery baseline  
**Working product:** Bosku One System  
**Business:** Bosku Cukur  
**Primary POS:** Kasir Pro

## 1. Executive summary

Bosku Cukur is a small, relationship-driven barbershop with a strong comfort proposition: customers come not only for a haircut but also for a relaxed, prepared place to sit, talk, watch TV, smoke, and leave feeling neat.

The current operation is intentionally simple and works. The major digital opportunity is therefore **not replacing the physical operation**. It is making customer behavior, return timing, daily customer visibility, and business performance more observable.

The central business questions are:
- How many customers are confirmed for today?
- How many have actually arrived and completed service?
- What revenue is projected versus actually realized?
- Which customers are due to return?
- How can old customers be encouraged to return without annoying them?
- Which sources bring new customers?
- Which customers actually become repeat customers?

## 2. People and roles

### Owner
Mas Allen is the principal decision maker. He focuses on cleanliness, tidiness, stock, money/turnover, customer handling, promotions, and the long-term branch vision.

### Capster / operational partner
The primary capster handles haircut service, opening readiness, cleaning, cash handling, customer interaction, some content capture, stock observation, and daily reporting.

### Co-owner / operational support
The co-owner helps with day-to-day maturity, operations, and emergencies.

The system must reflect actual responsibilities rather than invent formal corporate roles.

## 3. Customer segments
Typical customers:
- children
- students
- university students
- working men
- fathers / older customers

Catchment is approximately local, commonly within several kilometres. Most customers are male. Most transactions are adult haircuts.

## 4. Current customer journey
1. Customer discovers Bosku through referral, friends, walk-by, Google Maps, Instagram/TikTok, or WhatsApp.
2. Customer arrives, usually as a walk-in.
3. Customer is greeted and chooses a capster or waits if necessary.
4. Consultation happens when needed.
5. Haircut/service is performed.
6. Customer may wash, relax, smoke, drink coffee, or talk.
7. Customer pays.
8. Transaction is entered in Kasir Pro.
9. Customer leaves.
10. Return is currently driven mostly by memory, relationship, and occasional WhatsApp contact.

Booking exists but is rare. A customer may WhatsApp to confirm that the shop is open or reserve a time. One booking can contain multiple people and a customer may choose a capster.

## 5. Service and pricing baseline
- Children haircut: Rp15,000
- Adult haircut: Rp20,000
- Wash: Rp10,000
- Wash package: Rp25,000
- Full package: Rp30,000
- Beard: Rp10,000
- Black dye: Rp50,000
- Highlight: Rp50,000
- Bleaching: approximately Rp150,000

Most common transaction: adult haircut at Rp20,000.

The system must not hard-code these prices. Prices are configurable and must have history/audit when changed.

## 6. Money flow
Current split is approximately 60% capster / 40% owner.

Cash and transfer are accepted. Cash is reconciled at closing against Kasir Pro. The owner receives a daily report.

Historical rough turnover estimates are not a reliable source of truth. Kasir Pro transaction data should be used when available.

## 7. Daily operations
Opening is around 08:30–09:00:
- clean and tidy
- check tools
- check electricity/TV/fan
- prepare station

Customer arrival is event-driven; there is no assumption that customers arrive at a fixed time.

Walk-in remains the dominant mode. Small waits are handled informally. Long queues are uncommon.

Closing:
- clean
- tidy tools/area
- turn off equipment
- count cash
- reconcile with Kasir Pro
- send daily report

## 8. Current data
Kasir Pro is the transaction source. Customer data exists inconsistently and is not currently used as a relationship database.

Customer information may include:
- name
- WhatsApp number
- location/village
- age/school/work
- service
- transaction
- membership

Much customer knowledge is currently held in human memory.

## 9. Retention
Customers often return after roughly 2–3 weeks, some monthly, while others disappear for longer periods. This is an observation, not a verified KPI.

Membership exists and is free, with WhatsApp/name and discounts. Approximately 20–30 members were estimated, but this must be validated against actual records.

The system should calculate each customer's observed return interval rather than assume a universal 14-day cycle.

## 10. Marketing and content
Main differentiator: comfort and a more prepared/premium-feeling environment.

Tagline currently used:
**“Duduk Ganteng, Pulang Ganteng.”**

Raw content can be captured after service with customer permission. The current bottleneck is consistency and ownership, not editing capability. The owner decides whether captured content is posted.

## 11. Current tools
- Kasir Pro — transactions/POS
- WhatsApp — customer contact and informal booking
- Google Business Profile — location/reviews
- Instagram/TikTok — content/distribution

Social credentials are currently shared. Future integrations should use official permissions/OAuth where supported and never hard-code shared passwords.

## 12. Strengths
- Good customer relationships
- Comfortable environment
- Simple operating model
- Owner sees daily turnover
- Existing transaction system
- Customers tolerate walk-in model
- Real physical differentiation
- Owner is interested in useful systems
- Branch vision exists

## 13. Core problems
### P1 — Customer uncertainty
Most customers are walk-in, so the capster cannot easily know today's future customer count.

### P2 — Return uncertainty
Repeat behavior is largely implicit and memory-based.

### P3 — Customer data fragmentation
Transaction data and relationship knowledge are not connected into an actionable customer view.

### P4 — Attribution uncertainty
Acquisition source is asked informally but not consistently recorded.

### P5 — Content process inconsistency
Content is captured but often not published because there is no reliable process/owner.

### P6 — Manual reporting
Daily reporting still depends on memory and manual communication.

## 14. Opportunities
The strongest opportunity is a **Customer Certainty + Customer Return Engine**, supported by an owner BI layer.

The system should create visibility without creating work for the barber.

## 15. Explicit non-goals
Do not build:
- replacement POS
- full accounting
- payroll
- complex inventory ERP
- complex queue ticketing
- marketplace
- standalone booking application
- AI hairstyle recommendation
- AI image generator
- complicated loyalty platform

unless future evidence demonstrates a real business need.

## 16. Discovery confidence
🟢 Confirmed: walk-in dominance, Kasir Pro usage, owner decision role, retention as a priority, daily reconciliation, customer comfort proposition.

🟡 Working assumptions: exact retention rate, exact cost structure, exact service duration, exact historical customer counts.

🔴 Integration unknowns: Kasir Pro API/export limits, official WhatsApp automation path, customer-data export shape, Google/social integration permissions.

## 17. Product conclusion
Bosku One System should sit **above Kasir Pro**.

Kasir Pro answers:
> “What transaction happened?”

Bosku One System should answer:
> “Who is the customer, what is happening today, who is likely due back, what should we act on, and what did the business learn?”
