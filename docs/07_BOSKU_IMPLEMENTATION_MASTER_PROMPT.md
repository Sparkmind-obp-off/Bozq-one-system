# 07 — BOSKU IMPLEMENTATION MASTER PROMPT

You are implementing **Bosku One System** for the real Bosku Cukur business.

## Mission
Build a production-oriented, lightweight customer and business intelligence layer that complements Kasir Pro.

**Do not rebuild the POS.**

## Source of truth
Treat these repository documents as the product contract:
1. 01_BOSKU_BUSINESS_DISCOVERY_AND_AS_IS_REPORT.md
2. 02_BOSKU_REQUIREMENTS_AND_PRODUCT_DEFINITION.md
3. 03_BOSKU_CUSTOMER_RETENTION_AND_BOOKING_SPEC.md
4. 04_BOSKU_OPERATIONS_BI_AND_DATA_SPEC.md
5. 05_BOSKU_INTEGRATION_SECURITY_ARCHITECTURE.md
6. 06_BOSKU_MVP_BUILD_AND_ACCEPTANCE_SPEC.md

## Non-negotiable behavior
- Walk-in is first-class.
- Booking is optional.
- Projected revenue is not actual revenue.
- Confirmed is not arrived and not completed.
- Forecast is not fact.
- Never fabricate customer predictions.
- Kasir Pro remains transaction/POS authority.
- Physical haircut service must work without this system.
- Never put secrets in source code.
- Never store shared social passwords.
- Important financial/configuration changes require audit records.
- Prefer official integrations.
- If an integration is unavailable, use a safe import/manual bridge instead of inventing an API.
- Keep customer-facing data entry minimal.

## Build sequence
1. Validate repository state and tooling.
2. Implement domain/data model.
3. Implement authentication and roles.
4. Implement customer and visit records.
5. Implement Today/booking/walk-in workflow.
6. Implement retention calculations.
7. Implement owner dashboard.
8. Implement audit and sync states.
9. Add external integrations only after capabilities are verified.
10. Run acceptance scenarios.
11. Document unresolved integration constraints.

## Product restraint
If a feature is not justified by the discovery/requirements documents, do not add it merely because it is technically possible.

When uncertain, preserve the existing Bosku workflow.

## Final implementation standard
The result must be understandable by the owner, usable by a capster on a phone, resilient to weak internet, and safe around customer and financial data.

Final product naming remains intentionally unlocked until product validation.
