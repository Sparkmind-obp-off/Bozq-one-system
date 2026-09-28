# 16 — BOSKU LAYERING DECISION MATRIX

**Status:** Locked decision framework  
**Date:** 2026-09-28

## 1. The hierarchy

Bosku uses this hierarchy:

**OBSERVE → HUMAN / PROGRAMMATIC**

Inside PROGRAMMATIC, choose:

**SYSTEMATIC → AUTOMATION → AGENTIC**

These are not mandatory maturity stages.

They are alternative implementation levels selected by evidence.

## 2. Human vs Programmatic

| Question | Human | Programmatic |
|---|---|---|
| Requires physical action? | Usually | No |
| Requires nuanced relationship? | Usually | Assist only |
| Requires accountability/judgment? | Usually | Support |
| Deterministic data operation? | No | Yes |
| Repeated calculation? | No | Yes |
| Repeated status tracking? | No | Yes |
| Clear trigger/rule? | No | Yes |
| Multi-step reasoning across context? | Sometimes | Agentic candidate |

## 3. Programmatic differentiation

### SYSTEMATIC is enough when:
- a screen, database, form, query, calculation, or workflow state solves it;
- no autonomous execution is required;
- a human naturally initiates the action.

### AUTOMATION is better when:
- the same rule runs repeatedly;
- a trigger or schedule is reliable;
- human initiation adds no meaningful judgment;
- execution can be idempotent and observable.

### AGENTIC is justified only when:
- several steps must be selected dynamically;
- context must be interpreted;
- the path cannot be fully encoded as fixed rules;
- adaptation is valuable;
- tool permissions and failure handling are explicit;
- the expected value exceeds the complexity and risk.

## 4. Examples

| Workflow | Correct default |
|---|---|
| Store customer | SYSTEMATIC |
| Search customer | SYSTEMATIC |
| Calculate visit interval | SYSTEMATIC |
| Show today's bookings | SYSTEMATIC |
| Detect due customer every day | AUTOMATION |
| Prepare reminder candidate from explicit rules | AUTOMATION |
| Open WhatsApp for human review | SYSTEMATIC/HUMAN |
| Send sensitive customer message | HUMAN |
| Analyze multiple operational signals | AGENTIC candidate |
| Execute an unclear multi-step operational investigation | AGENTIC candidate |
| Cut hair | HUMAN |

## 5. Agentic gate

Do not build an agent unless all are true:

- the workflow is already observed;
- the burden is material;
- Systematic is insufficient;
- Automation rules are insufficient;
- the expected outcome can be evaluated;
- tools/actions have bounded permissions;
- human escalation exists;
- failures are recoverable;
- auditability exists.

## 6. Design principle

**Simple is not primitive.**

If a Systematic screen removes the burden, that is a successful system.

If an Automation removes the need for repeated initiation, use Automation.

If an Agent is necessary, use an Agent.

Never increase technical complexity for appearance.
