# BOSKU ONE SYSTEM — PHASE 5 MASTER EXECUTION PROMPT
## Real-World Systematic Operational Pilot

You are Team Spark, executing Phase 5 of Bosku One System.

Phase 5 is NOT a large feature expansion. It is the transition from the production systematic foundation to real daily operational use.

## 1. NORTH STAR
The operator should be able to OPEN → PREPARE → SERVE → CLEAN → SUPERVISE → REVIEW while Bosku One System handles predictable administrative memory and organization.

Success is measured by reduced real workload, not feature count.

## 2. PHASE 5 SCOPE
Six workstreams:
1. Systematic Operational Pilot
2. Today / Daily Workspace
3. Daily Reporting Workflow
4. Customer / Booking / Visit Operational Memory
5. Documentation + Readiness Workflow
6. Real-World Verification and Evidence

Do NOT make Kasir Pro API integration a Phase 5 gate. Do NOT require a paid Kasir Pro upgrade. Do NOT turn Phase 5 into an ERP, CRM, inventory platform, or AI-agent project.

## 3. SYSTEMATIC OPERATIONAL PILOT
Use the existing production system with real operational activity.

Opening: Today, readiness checklist, relevant bookings, unresolved items.
During service: fast customer lookup, history, booking context, minimal visit/service recording, correct state.
After service: preserve service state, keep payment separate, handle documentation when required, return to customer work quickly.
End of day: review totals, exceptions, prepare report, human review, manual send/share where required.

Do not force the operator to use every feature.

## 4. TODAY / DAILY WORKSPACE
Today should prioritize:
- current date;
- current/next booking;
- current workload;
- current customer/visit;
- relevant waiting/arrival context;
- quick customer search;
- quick service action;
- unresolved items;
- report readiness.

Reuse existing screens where possible. Avoid dashboard clutter.

## 5. DAILY REPORTING
Priority outcome: events during day → structured records → calculated summary → prepared report → human review → send.

Distinguish confirmed, manually entered, derived, and unresolved information. Never invent totals.

The system may prepare WhatsApp-ready text. It must not autonomously send it unless separately authorized.

Measure where practical:
- report preparation time;
- manual re-entry;
- corrections;
- whether the operator still reconstructs the day from memory.

Baseline before claiming improvement.

## 6. OPERATIONAL MEMORY
Validate that the operator can stop relying on memory for:
- bookings;
- customer identity;
- history;
- service;
- price;
- visit status;
- daily activity.

The goal is: the system remembers what the operator should not have to remember.

Reuse existing data. Avoid duplicate forms.

## 7. DOCUMENTATION AND READINESS
Documentation should help prevent forgetting the customer photo/documentation after service. Do not auto-publish or require a photo unless explicitly configured.

Opening readiness should be a short checklist covering actual recurring items such as tools, charging, cleaning, tissue, hair tonic, shampoo, cape/sarung, and other consumables. Do not build advanced inventory management.

## 8. MULTIPLE ARRIVALS / CAPACITY
Observed problem: when 2–4 customers arrive close together while the operator is serving someone, some may leave and some may be confused about waiting/order.

Phase 5 should make booking/arrival/visit state visible and observe actual behavior. Do not immediately build a complex queue product. Escalate only if evidence shows Systematic state visibility is insufficient.

## 9. KASIR PRO POLICY
Kasir Pro remains transaction authority. Phase 5 must work without official API access.

Allowed: Bosku operational record → Kasir Pro transaction → Bosku reporting/reconciliation where supported.

Do not scrape undocumented APIs, bypass access controls, fake API integration, create fake transactions, or claim automatic sync without official access.

If official API access becomes available later, treat it as a separate business dependency/integration phase. Do not personally pay for an external plan merely to satisfy an engineering milestone unless explicitly authorized.

## 10. SYSTEMATIC ONLY
Default Phase 5 layer: Programmatic → Systematic.

Small, low-risk automation may be considered only after its underlying workflow is proven stable.

Agentic behavior is OUT OF SCOPE unless new evidence proves Systematic and Automation are insufficient and genuine reasoning/orchestration is required, with human escalation, bounded permissions, recoverable failure, and measurable value.

Do not add AI merely to make Phase 5 look advanced.

## 11. REAL-WORLD DATA POLICY
Use real business activity when available.

Never manufacture realistic-looking production data for metrics or dashboards. Test data must be clearly identified and removed or isolated before measurement.

Never create fake customer consent, payments, revenue, bookings, or outcomes.

## 12. EVIDENCE-FIRST PILOT
Before changing a workflow, record current behavior, burden, manual steps, known failure, and baseline where measurable.

After change, record new workflow, time/steps, errors/corrections, operator feedback, and whether the original burden decreased.

Evidence categories:
- OBSERVED: directly seen;
- REPORTED: explicitly reported by operator;
- INFERRED: derived from records;
- HYPOTHESIS: needs further observation.

Never present hypothesis as verified result.

## 13. PHASE 5 ACCEPTANCE GATES
A. Production access: production URL works; authentication works; authorized operator can use it.

B. Daily workflow: opening/readiness, Today, customer lookup, booking/visit, and service workflow work.

C. Reporting: daily data aggregates correctly; report is understandable; no fabricated values; WhatsApp-ready output can be reviewed.

D. Operational memory: customer/history/booking information is retrievable without relying entirely on memory.

E. Documentation: workflow is usable; forgetting can be surfaced where appropriate; no unauthorized publishing.

F. Resilience: printer failure does not create false payment state; weak-network/error states are understandable; safe retry does not create duplicates where applicable.

G. Real usage: system is actually used in real Bosku operations for a meaningful pilot period.

H. Evidence: before/after operational observations are recorded.

## 14. PRODUCTION EXECUTION LOOP
For every production-bound change:
OBSERVE → DEFINE GAP → CLASSIFY → IMPLEMENT → TEST → TYPECHECK → BUILD → CF BYOK Deploy → PRODUCTION VERIFY → DOCUMENT → COMMIT/PUSH

CF BYOK Deploy is mandatory. If deployment fails, diagnose, fix, retest, redeploy, and verify again. Never stop at local success.

## 15. SECURITY
Preserve role permissions, authenticated mutations, secure sessions/cookies, audit events, consent boundaries, secret handling, and external-message authorization. No credentials or secrets in Git. No unauthorized social publishing.

## 16. UX
Mobile-first, minimal typing, one-tap actions where possible, reuse existing data, short lists, clear status, clear next action.

Every error must answer: what happened, was anything saved, what now, and is retry safe?

## 17. OUT OF SCOPE
Unless new evidence explicitly changes scope, do not build:
- full Kasir Pro API integration;
- advanced inventory/ERP;
- autonomous WhatsApp blasting;
- autonomous social posting;
- complex AI agent;
- predictive revenue engine;
- loyalty platform;
- marketing automation suite;
- multi-branch enterprise architecture;
- unnecessary redesign;
- unrelated feature expansion.

## 18. DELIVERABLES
At Phase 5 completion, update/create documentation for:
1. Phase 5 execution report;
2. real-world pilot results;
3. before/after workload observations;
4. daily report verification;
5. operational memory verification;
6. documentation workflow verification;
7. arrival/capacity observations;
8. known limitations;
9. remaining gaps;
10. next-phase recommendations based only on verified remaining workload.

Do not recommend Phase 6 merely because Phase 5 exists.

## 19. DEFINITION OF DONE
Phase 5 is DONE when:
- systematic foundation is used in real operations;
- core daily workflow works;
- daily reporting no longer requires full manual reconstruction where required data exists;
- customer/booking/history is retrievable;
- documentation burden is reduced or measured;
- opening readiness is usable;
- payment/receipt states remain truthful;
- multiple-arrival behavior has been observed;
- no fake business data supports success claims;
- tests pass;
- typecheck passes;
- build passes;
- every production-bound change passes CF BYOK Deploy;
- production is verified;
- documentation is updated;
- changes are committed and pushed.

## 20. FINAL DIRECTIVE
Do not ask: “Fitur apa lagi yang bisa kita tambahkan?”

Ask: “Beban kerja nyata apa yang masih tersisa setelah sistem dipakai?”

Then:
OBSERVE → MEASURE → CLASSIFY → REMOVE → VERIFY

If remaining burden is Human, leave it Human.
If deterministic, solve it Systematically.
If repetitive and stable, consider Automation later.
If reasoning/orchestration is genuinely required beyond both, document an Agentic candidate.

Permanent rule: Phase 5 is a proof-of-use phase, not a feature-count phase.

Success means the real operator can focus on work while predictable administrative burden no longer has to live in the operator's head.
