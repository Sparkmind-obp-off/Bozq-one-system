# 14 — BOSKU WORKLOAD GAP REGISTER & LAYER MAP

**Status:** Initial operational map  
**Date:** 2026-09-28  
**Purpose:** Map known Bosku workloads to the appropriate layer without forcing automation where a simpler solution is enough.

## 1. Layer legend

- **OBSERVE** — discover and validate burden before designing a solution.
- **HUMAN** — human judgment/action remains primary.
- **SYSTEMATIC** — deterministic application behavior is enough.
- **AUTOMATION** — rule/trigger/schedule can execute repeatedly.
- **AGENTIC** — multi-step reasoning/orchestration may be justified later.

## 2. Current workload map

| Workload | Current burden | Primary layer now | Future layer if evidence appears | Human role |
|---|---|---|---|---|
| Physical haircut/service | Physical + relational | HUMAN | HUMAN | Full ownership |
| Customer consultation | Contextual judgment | HUMAN | HUMAN + System support | Decision |
| Customer lookup | Memory/search burden | SYSTEMATIC | SYSTEMATIC | Use result |
| Customer history | Memory burden | SYSTEMATIC | SYSTEMATIC | Interpret |
| Visit recording | Repetitive record keeping | SYSTEMATIC | AUTOMATION where trigger-safe | Confirm |
| Booking state | Repetitive status tracking | SYSTEMATIC | AUTOMATION | Handle exceptions |
| Today workload view | Information assembly | SYSTEMATIC | AUTOMATION refresh/alerts | Act |
| Return interval calculation | Repetitive calculation | SYSTEMATIC | AUTOMATION | Interpret |
| Due candidate detection | Daily checking burden | AUTOMATION | AUTOMATION | Review |
| Reminder eligibility | Rule-based checking | AUTOMATION | AUTOMATION | Review |
| Reminder message preparation | Repetitive preparation | SYSTEMATIC/AUTOMATION | AGENTIC only if personalization becomes materially complex | Approve/send |
| WhatsApp send | External customer communication | HUMAN | Official automation only if justified | Final action |
| Customer consent | Trust/permission decision | HUMAN + SYSTEMATIC record | AUTOMATION enforcement | Own consent |
| CSV validation | Repetitive data checking | SYSTEMATIC | AUTOMATION | Review exceptions |
| CSV commit | Data mutation | SYSTEMATIC + HUMAN confirmation | AUTOMATION only with strong safeguards | Authorize |
| Kasir Pro transaction entry | Existing POS workflow | HUMAN + Kasir Pro | Official API/automation later | Operate |
| Transaction reconciliation | Repetitive comparison | SYSTEMATIC | AUTOMATION | Review exception |
| Daily reporting | Memory/manual reporting | SYSTEMATIC | AUTOMATION | Review/share |
| Owner dashboard | Information aggregation | SYSTEMATIC | AUTOMATION refresh | Decide |
| Retention analysis | Multi-signal interpretation | SYSTEMATIC initially | AGENTIC later if complexity is proven | Decide |
| Operational anomaly investigation | Cross-source reasoning | OBSERVE | AGENTIC candidate | Decide |
| New workflow discovery | Unknown/hidden burden | OBSERVE | OBSERVE continuously | Observe |
| Feature prioritization | Business judgment | HUMAN + OBSERVE | Agent-assisted analysis later | Decide |

## 3. Known high-value workload transfers

### A. Human memory → Customer history

**Before:** operator remembers customer context.

**After:** system stores and retrieves customer history.

**Layer:** SYSTEMATIC.

No agent required.

### B. Manual date calculation → Return intelligence

**Before:** operator informally remembers when customers normally return.

**After:** system calculates observed intervals from completed visits.

**Layer:** SYSTEMATIC.

### C. Daily checking → Due candidates

**Before:** operator manually checks who may be due.

**After:** rule-based engine creates candidates.

**Layer:** AUTOMATION.

### D. Repetitive message preparation → Reminder preparation

**Before:** operator repeatedly reconstructs a message.

**After:** system prepares a short message after eligibility review.

**Layer:** SYSTEMATIC/AUTOMATION.

Sending remains human-controlled.

### E. Manual report assembly → Owner overview

**Before:** information is assembled manually.

**After:** dashboard aggregates operational information.

**Layer:** SYSTEMATIC.

### F. Future cross-signal analysis → Agentic candidate

Potential future workflow:

**Customer history + service mix + visit pattern + operational exceptions → analysis → explanation → proposed actions.**

This is not an MVP requirement.

It becomes AGENTIC only if the complexity and value are demonstrated.

## 4. Current priority

The immediate objective is **not** to maximize automation.

The immediate objective is:

1. use the current Systematic layer in real operations;
2. observe where workload remains;
3. identify repeated burden;
4. transfer only justified workload;
5. measure whether burden actually decreases.

## 5. Gap register template

Every new burden should be recorded as:

| Field | Value |
|---|---|
| Date observed | |
| Operator | |
| Workflow | |
| Current steps | |
| Human burden | |
| Frequency | |
| Estimated effort | |
| Failure/forgetfulness risk | |
| Business impact | |
| Existing workaround | |
| Evidence | |
| Proposed layer | |
| Why this layer | |
| Simpler layer rejected because | |
| Human approval needed | |
| Success metric | |
| Status | OBSERVED / VALIDATED / BUILT / VERIFIED / DEFERRED |

## 6. Stop rule

If a workload is not frequent, costly, error-prone, or materially important, do not automatically build for it.

Observe first.

Evidence determines scope.
