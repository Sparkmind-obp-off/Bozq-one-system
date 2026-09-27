# 05 — INTEGRATION, SECURITY & ARCHITECTURE

## 1. Architecture principle
Bosku One System sits above existing tools.

Customer/operational layer
↓
Bosku One System
↓
Kasir Pro / WhatsApp / Google / Social integrations

Integrate rather than replace.

## 2. Kasir Pro integration
Unknowns to validate:
- official API availability
- export formats
- customer export
- transaction export
- authentication
- webhooks
- rate limits
- terms/permissions
- historical data access

Preferred order:
1. official API
2. official export/import
3. controlled CSV workflow
4. manual bridge as temporary MVP

Never scrape or bypass controls without authorization.

## 3. WhatsApp integration
Validate:
- official business account/channel
- API/provider availability
- opt-in requirements
- template requirements
- message limits/cost
- inbound webhook support

Separate:
**message prepared** from **message actually sent**.

## 4. Google Business Profile
Potential uses:
- business information
- review/visibility workflow
- acquisition context

Only implement capabilities supported by official APIs and authorized accounts.

## 5. Instagram/TikTok
Content automation is secondary to retention/customer intelligence.

Do not store shared social passwords. Prefer official OAuth/permission flows if automation becomes necessary.

## 6. Security
Roles:
- Owner: full business/admin control
- Capster: operational customer/booking access
- Future branch manager: scoped branch access

Principles:
- least privilege
- secrets in environment/secret manager
- encrypted transport
- audit important changes
- no credentials in source
- no raw secrets in logs

## 7. Personal data
Collect only operationally useful data.

Customer consent must be explicit where required for reminders/marketing.

Support:
- opt-out
- correction
- deletion/anonymization policy where applicable
- access control
- audit trail

## 8. Financial safety
Revenue should be read from the authoritative transaction source where possible.

Manual financial adjustment requires:
- reason
- actor
- timestamp
- old value
- new value

No automated transfer, payout, or financial action in MVP.

## 9. Architecture candidate
Cloudflare-first is a suitable implementation direction if free-tier constraints remain satisfied:
- Pages/Workers for application/API
- D1 or another suitable database
- durable/local queue strategy for sync
- scheduled jobs for reminder eligibility
- secure secrets/configuration

Final infrastructure must be confirmed against current pricing/limits before implementation.

## 10. Failure modes
Must tolerate:
- internet outage
- Kasir Pro unavailable
- printer failure
- WhatsApp integration failure
- duplicate sync
- partial sync
- stale external data

Physical haircut service must not depend on system availability.
