# Bosku Internal Observation Engine

## Status
- Observe is an internal product-development layer.
- Bootstrap operators are not required to fill technical observation forms.
- The current Observe round is sufficiently evidenced to move into Systematic implementation.
- Observe remains continuously active through real-world usage.

## Operating Loop
REAL WORLD → OBSERVE → IDENTIFY BURDEN → IDENTIFY GAP → CLASSIFY → BUILD → USE → VERIFY → OBSERVE AGAIN

## Inputs
- Operator narrative and daily workflow
- Interruptions and context switching
- Repeated work
- Memory/search/calculation burden
- Errors and forgotten work
- Customer-flow friction
- Actual production usage

## Required Outputs
Each observation should produce:
1. Workload
2. Evidence
3. Real gap
4. Human vs Programmatic classification
5. If Programmatic: Systematic vs Automation vs Agentic
6. Expected workload transfer
7. Verification method

## Current Evidence
Validated burdens:
- Daily report requires remembering and manually composing WA.
- Kasir Pro transaction flow creates context switching after a service.
- Customer/photo documentation can be forgotten.
- Booking depends partly on memory and WhatsApp.
- Customer/history/price lookup is manual.
- Opening readiness and stock checks depend on memory.
- 2–4 arrivals close together can cause waiting, confusion, and customer drop-off.
- Printer failure can affect receipt printing and must not erase service/payment state.

## Evidence Rule
Observed facts can drive implementation. Inferences require further observation. Do not build a feature only because it sounds useful.

## Hidden Workload Detection
Look for:
- memory
- search
- calculation
- repetition
- re-entry
- coordination
- monitoring
- reporting
- exception recovery
- context switching
- waiting/customer loss

## Layer Rule
First decide Human vs Programmatic.
Then, only for Programmatic work:
- Systematic: deterministic state/data/workflow.
- Automation: repeatable trigger/schedule execution.
- Agentic: multi-step reasoning/adaptation where lower layers are insufficient.

Use the lowest-complexity layer that safely solves the burden.

## Bootstrap Rule
Observation is performed by the system-building team for now. A future paid/onboarding product may expose a simplified discovery experience, but technical classification remains internal.
