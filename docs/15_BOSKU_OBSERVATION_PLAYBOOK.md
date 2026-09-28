# 15 — BOSKU OBSERVATION PLAYBOOK

**Status:** Pilot operating procedure  
**Date:** 2026-09-28

## 1. Purpose

Observation is the first layer because humans often normalize unnecessary work.

The goal is to notice:

- repeated work;
- work dependent on memory;
- work requiring copy/paste;
- work requiring repeated searching;
- work that causes mistakes;
- work that interrupts customer service;
- work that is performed only because no system exists;
- work that a deterministic system could own;
- work that may eventually justify automation or agentic orchestration.

## 2. Observe during real work

Do not create artificial test workflows only to find features.

Observe real shifts.

Useful prompts:

- “Apa yang barusan harus saya lakukan berulang kali?”
- “Apa yang barusan harus saya ingat sendiri?”
- “Apa yang tadi saya cari?”
- “Apa yang tadi saya hitung manual?”
- “Apa yang tadi saya tulis ulang?”
- “Apa yang tadi membuat pekerjaan terhenti?”
- “Apa yang tadi mudah lupa?”
- “Apa yang tadi sebenarnya bisa dilakukan komputer?”
- “Apa yang tadi membutuhkan judgment manusia dan sebaiknya tetap begitu?”

## 3. Observation categories

### Memory burden
Human remembers something that software could safely store.

### Search burden
Human searches across messages, notes, screens, or memory.

### Calculation burden
Human repeatedly calculates a deterministic result.

### Repetition burden
Human repeats the same steps.

### Coordination burden
Human moves information between people/tools.

### Monitoring burden
Human repeatedly checks whether a condition has occurred.

### Reporting burden
Human manually assembles information for another person.

### Decision burden
Human must interpret multiple signals.

### Physical/relational burden
Work genuinely requires physical presence or human interaction.

## 4. From observation to layer

Use this sequence:

**OBSERVE → VALIDATE → CLASSIFY → DESIGN → IMPLEMENT → VERIFY**

Never jump directly:

**OBSERVE → AGENT**

## 5. Validation questions

Before building:

1. Does this happen in real operations?
2. How often?
3. How much effort does it consume?
4. What happens when it is forgotten or done incorrectly?
5. Is the workload actually undesirable?
6. Can the existing Kasir Pro or another existing tool already solve it?
7. Can a simple Bosku System screen solve it?
8. Is a rule enough for automation?
9. Does it genuinely require reasoning/adaptation for agentic behavior?

## 6. Evidence standards

Strong evidence:
- repeated occurrence during real shifts;
- operator reports consistent burden;
- measurable time reduction;
- measurable error reduction;
- fewer repeated manual steps;
- successful daily usage.

Weak evidence:
- “This would be cool.”
- “AI could probably do this.”
- “Other apps have this.”
- one unusual occurrence;
- a feature built before the workflow is understood.

## 7. Daily observation log

Use one entry per meaningful workload:

**Date:**  
**Workflow:**  
**What happened:**  
**Human steps:**  
**Pain/burden:**  
**Frequency:**  
**Current workaround:**  
**Could Systematic solve it?**  
**Could Automation solve it?**  
**Would Agentic behavior actually be needed?**  
**What must remain Human?**  
**Evidence/measurement:**  
**Decision:** Keep Human / Systematic / Automate / Agentic candidate / Defer

## 8. Weekly review

At the end of a pilot week:

1. group repeated observations;
2. remove one-off noise;
3. identify the highest recurring burden;
4. map each burden to a layer;
5. implement only the smallest useful transfer;
6. measure again.

The objective is continuous workload reduction, not continuous feature growth.
