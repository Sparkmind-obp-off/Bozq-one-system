# 05 — INTEGRATION, SECURITY & ARCHITECTURE

## 1. Architecture principle
Bosku One System sits above existing tools.

Customer/operational layer
↓
Bosku One System
↓
KasirPro / WhatsApp / Google / Social integrations

Integrate rather than replace.

## 2. KasirPro — current validation and staged integration
KasirPro remains the transaction authority.

The user has confirmed directly with KasirPro that the API/integration capability relevant to AI agents and external integrations is available on the **Max subscription tier**. The exact commercial terms and technical API contract should be verified from KasirPro documentation/account support before production implementation.

This is **not an MVP blocker**.

Bosku development therefore uses a staged strategy:

1. **Private/self-use build first** — develop and validate Bosku without requiring a paid KasirPro Max integration.
2. **Proof of value** — confirm that the product is useful, stable, and saleable.
3. **Customer deployment** — when a real customer/business is ready and integration is commercially justified, subscribe to the appropriate KasirPro tier and use its official API/integration capability.
4. **Production connector** — implement against the official API/authentication/webhook contract supplied by KasirPro.
5. **Scale/expand** — only after the integration works reliably for the first deployment.

For the private MVP, an authorized export/import bridge (CSV/Excel) can still be used for realistic transaction data and integration-proof testing.

Never scrape, bypass controls, extract credentials, or use undocumented access without authorization.

Minimum desired dataset: transaction ID/invoice, timestamp, service/item, amount/discount, payment method, customer/member identifier/name/WhatsApp when available, cashier/capster attribution, and cancellation/void status when available.

Bosku may enrich customer/retention intelligence but must not silently rewrite authoritative transaction values.

## 3. Future KasirPro API integration model
The target production pattern is:

KasirPro Max
→ official API/authentication
→ Bosku secure integration gateway
→ normalization/sync layer
→ Bosku customer + visit intelligence
→ dashboard / return intelligence / reminder workflow

Potential inbound events/data:
- completed transactions
- customer/member updates
- transaction corrections or cancellations, if exposed
- service/catalog or pricing data, if exposed
- cashier/capster attribution, if exposed
- webhooks/events, if exposed.

The exact endpoints, authentication method, rate limits, webhook semantics, pagination, retry behavior, and available resources are **TBD from the official KasirPro contract**. Do not invent endpoint names or API behavior before verification.

Integration requirements:
- secret storage outside source code
- scoped credentials
- idempotent sync
- external record IDs preserved
- sync cursor/checkpoint
- retry with backoff
- duplicate protection
- provenance/source metadata
- audit log
- safe handling of revoked/expired credentials
- read-only financial ingestion by default
- no silent mutation of KasirPro records.

## 4. WhatsApp — selected operating model
For the pilot, the human sender is the user/capster. Bosku starts as a reminder intelligence and preparation layer:

Customer due → consent check → reminder candidate → message prepared → user sends manually → result logged.

Meta's current WhatsApp Business policy requires the business to have the person's number and opt-in for subsequent WhatsApp messages. Business-initiated conversations on the Platform require an approved template; replies can be sent without a template within the 24-hour customer-service window. Opt-outs must be respected.

Unknown consent is not treated as consent.

## 5. Reminder authority
- User/capster = reminder sender.
- Owner can see reminder activity.
- Other capster does not automatically receive sending authority.

Separate eligibility, preparation, and actual sending so the system has a lightweight audit trail.

## 6. Capster split / owner visibility
Owner needs performance visibility by capster. Current scope is exactly two capsters: user/capster and the second capster.

Preserve capster attribution, completed customer count, transaction value, service mix, and period. If KasirPro provides attribution, it is authoritative. If not, Bosku may record an operational attribution only from a reliable human-confirmed source.

## 7. Branch and pricing strategy
Multi-branch is future-ready but deferred. Current operation remains one branch.

Use stable identifiers such as business_id, branch_id, service_id, and price_rule_id so future expansion does not require redesign. Pricing should be versionable so historical transactions are not rewritten when prices change.

## 8. Other integrations
Google Business Profile: future validation, official API only.
Instagram/TikTok: secondary; no shared-password automation; use official OAuth/permissions if needed.

## 9. Security
- Owner: full business/admin and financial visibility.
- User/capster: operational customer, booking, reminder, and daily workflow access.
- Other capster: operational access as configured.
- Future branch manager: scoped branch access.

Use least privilege, secure secrets, encrypted transport, audit important changes, and never store credentials in source or logs.

## 10. Financial safety
Revenue should be read from the authoritative transaction source. Manual financial adjustments require reason, actor, timestamp, old value, and new value. No automated financial transfer or payout in MVP.

## 11. Architecture candidate
Cloudflare-first remains the implementation direction if free-tier constraints remain satisfied: Pages/Workers, D1 or suitable database, sync/queue strategy, scheduled reminder eligibility, and secure secrets/configuration.

## 12. Failure modes
Must tolerate internet outage, KasirPro unavailable, printer failure, WhatsApp integration failure, duplicate/partial sync, and stale external data. Physical haircut service must never depend on system availability.

## 13. Current integration status
| Integration | Status | MVP approach |
|---|---|---|
| KasirPro | 🟡 Max-tier API/integration reported by user; technical contract TBD | Private build via CSV/Excel bridge; official Max integration after sale/customer validation |
| WhatsApp | 🟢 Human sender chosen | Consent-gated manual reminder |
| WhatsApp Cloud API | 🟡 Future | Only after automation is justified |
| Google Business Profile | 🟡 Future | Official API only |
| Instagram/TikTok | 🟡 Future | No password-based automation |
| Multi-branch | 🟡 Future | Keep identifiers ready, defer UI |

## 14. Decision
**KasirPro API is a post-validation integration, not a prerequisite for building Bosku.**

Build and prove the Bosku product independently first. When the product has a real paying customer or a deployment where KasirPro integration creates clear value, purchase/upgrade KasirPro to the required Max tier and connect through the official integration surface.

This keeps development capital-efficient while preserving a clear production path.

## 15. Principle
Do not automate what has not yet been proven necessary.

Real workflow:

Private Bosku build
→ realistic data/import proof
→ product validation
→ real sale/customer
→ KasirPro Max
→ official API/integration
→ secure sync
→ customer/visit intelligence
→ due customer
→ consent check
→ reminder candidate
→ user/business sends
→ response/booking
→ next visit
→ measured return.
