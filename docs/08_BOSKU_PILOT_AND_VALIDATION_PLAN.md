# 08 — BOSKU PILOT & VALIDATION PLAN

## Objective
Validate that Bosku One System improves visibility and customer return behavior in the real shop before expanding scope or productizing it for other barbershops.

## Pilot length
7–14 days for the first operational pilot.

## Baseline
Capture:
- daily customer count
- new vs returning
- actual revenue
- booking count
- reminder activity
- repeat behavior where historical data is available
- manual reporting effort

## Pilot A
Use:
- Today dashboard
- customer history
- walk-in recording
- actual vs projected revenue
- retention due list

Keep reminder sending human-approved.

## Pilot B
Test:
- reminder workflow
- booking conversion
- no-show handling
- sync/import reliability
- owner dashboard usefulness

## Validation questions
1. Did the owner use the dashboard without prompting?
2. Did capster workflow become slower or faster?
3. Did the system identify customers worth contacting?
4. Did contacted customers return or book?
5. Was projected revenue understandable and non-misleading?
6. Did any integration cause operational risk?
7. Which feature was unused?
8. Which feature was unexpectedly valuable?

## Decision gates
### Keep
Feature is used and produces measurable operational value.

### Simplify
Feature is useful but creates unnecessary work.

### Remove
Feature is unused and has no demonstrated value.

### Investigate
Feature has potential but evidence is insufficient.

## Productization gate
Do not package this as generic barbershop SaaS until:
- real Bosku workflow is stable
- data model is reusable
- integration assumptions are documented
- security/privacy controls are adequate
- pilot shows repeatable value
- onboarding does not require founder-only explanation

## Final principle
Build from observed demand, validate in the real business, then generalize.
