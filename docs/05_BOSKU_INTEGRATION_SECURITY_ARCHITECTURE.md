# 05 — INTEGRATION, SECURITY & ARCHITECTURE

## 1. Architecture principle
Bosku One System sits above existing tools.

Customer/operational layer
↓
Bosku One System
↓
KasirPro / WhatsApp / Google / Social integrations

Integrate rather than replace.

## 2. KasirPro — current validation
KasirPro publicly documents customer/member data, transaction history, reporting, cloud back office, employee/cashier management, and online/offline operation. Public materials also show reporting/export capabilities. An official public developer API/webhook specification has not been verified.

Integration order:
1. Official API/webhook, if KasirPro confirms availability.
2. Official export/import such as CSV/Excel/JSON.
3. Controlled manual CSV bridge for MVP.
4. Never scrape, bypass controls, extract credentials, or use undocumented access without authorization.

Minimum dataset: transaction ID/invoice, timestamp, service/item, amount/discount, payment method, customer/member identifier/name/WhatsApp when available, cashier/capster attribution, and cancellation/void status when available.

KasirPro remains the transaction authority. Bosku may enrich customer/retention intelligence but must not silently rewrite authoritative transaction values.

## 3. WhatsApp — selected operating model
For the pilot, the human sender is the user/capster. Bosku starts as a reminder intelligence and preparation layer:

Customer due → consent check → reminder candidate → message prepared → user sends manually → result logged.

Meta's current WhatsApp Business policy requires the business to have the person's number and opt-in for subsequent WhatsApp messages. Business-initiated conversations on the Platform require an approved template; replies can be sent without a template within the 24-hour customer-service window. Opt-outs must be respected.

Unknown consent is not treated as consent.

## 4. Reminder authority
- User/capster = reminder sender.
- Owner can see reminder activity.
- Other capster does not automatically receive sending authority.

Separate eligibility, preparation, and actual sending so the system has a lightweight audit trail.

## 5. Capster split / owner visibility
Owner needs performance visibility by capster. Current scope is exactly two capsters: user/capster and the second capster.

Preserve capster attribution, completed customer count, transaction value, service mix, and period. If KasirPro provides attribution, it is authoritative. If not, Bosku may record an operational attribution only from a reliable human-confirmed source.

## 6. Branch and pricing strategy
Multi-branch is future-ready but deferred. Current operation remains one branch.

Use stable identifiers such as business_id, branch_id, service_id, and price_rule_id so future expansion does not require redesign. Pricing should be versionable so historical transactions are not rewritten when prices change.

## 7. Other integrations
Google Business Profile: future validation, official API only.
Instagram/TikTok: secondary; no shared-password automation; use official OAuth/permissions if needed.

## 8. Security
- Owner: full business/admin and financial visibility.
- User/capster: operational customer, booking, reminder, and daily workflow access.
- Other capster: operational access as configured.
- Future branch manager: scoped branch access.

Use least privilege, secure secrets, encrypted transport, audit important changes, and never store credentials in source or logs.

## 9. Financial safety
Revenue should be read from the authoritative transaction source. Manual financial adjustments require reason, actor, timestamp, old value, and new value. No automated financial transfer or payout in MVP.

## 10. Architecture candidate
Cloudflare-first remains the implementation direction if free-tier constraints remain satisfied: Pages/Workers, D1 or suitable database, sync/queue strategy, scheduled reminder eligibility, and secure secrets/configuration.

## 11. Failure modes
Must tolerate internet outage, KasirPro unavailable, printer failure, WhatsApp integration failure, duplicate/partial sync, and stale external data. Physical haircut service must never depend on system availability.

## 12. Current integration status
| Integration | Status | MVP approach |
|---|---|---|
| KasirPro | 🟡 API/webhook not publicly verified | Validate official API/export; controlled import bridge if needed |
| WhatsApp | 🟢 Human sender chosen | Consent-gated manual reminder |
| WhatsApp Cloud API | 🟡 Future | Only after automation is justified |
| Google Business Profile | 🟡 Future | Official API only |
| Instagram/TikTok | 🟡 Future | No password-based automation |
| Multi-branch | 🟡 Future | Keep identifiers ready, defer UI |

## 13. Blocking questions remaining
1. What KasirPro account/plan is Bosku currently using, and can we get a CSV/Excel export sample of transactions plus customers/members?
2. Which number will be the operational Bosku reminder number? The user's existing WhatsApp/WhatsApp Business number is acceptable for the pilot.
3. For existing customers, how will the user identify those who have already explicitly agreed to receive reminders?
4. Does KasirPro currently record the actual capster/cashier for each Bosku transaction?

Everything else can be deferred until the pilot produces evidence.

## 14. Principle
Do not automate what has not yet been proven necessary.

Real workflow:
KasirPro → customer/visit intelligence → due customer → consent check → reminder candidate → user sends → response/booking → next visit → measured return.