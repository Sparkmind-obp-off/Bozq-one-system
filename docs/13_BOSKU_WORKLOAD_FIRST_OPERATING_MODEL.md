# 13 — BOSKU WORKLOAD-FIRST OPERATING MODEL

**Status:** Locked operating principle  
**Date:** 2026-09-28  
**Purpose:** Define why Bosku One System exists and how every future workflow is assigned to Human, Systematic, Automation, or Agentic layers.

## 1. Core thesis

Bosku One System is not built to look advanced.

It exists to **move real operational workload away from humans when that workload can be handled safely by a system**.

The starting point is never a feature request.

The starting point is:

> **What is making a real human's work heavier than it needs to be?**

The operating loop is:

**Observe → Identify Burden → Define Real Gap → Classify Layer → Implement → Use → Measure → Re-observe**

## 2. The five layers

### Layer 0 — OBSERVE

The primary discovery layer.

Purpose:
- notice work humans perform without questioning it;
- expose hidden repetition;
- find memory-dependent work;
- identify unnecessary manual steps;
- discover work that can be moved into software;
- distinguish a real burden from an imagined feature opportunity.

Observe is deliberately before solution design.

A human may not realize that a workload is automatable until the workflow is mapped.

### Layer 1 — HUMAN

Work that should remain human-led.

Examples:
- physical haircut/service;
- customer relationship;
- nuanced consultation;
- sensitive complaints;
- contextual judgment;
- business decisions;
- actions requiring direct accountability.

The system may assist the human, but does not need to replace the human.

### Layer 2 — SYSTEMATIC

Work that can be reliably handled by deterministic software.

Examples:
- storing records;
- searching customer history;
- calculating observed intervals;
- showing today's workload;
- tracking booking state;
- displaying customer status;
- enforcing permissions;
- creating audit records;
- validating structured input.

If a simple system solves the burden, stop here.

### Layer 3 — AUTOMATION

Work that can execute from explicit rules, triggers, schedules, or deterministic conditions.

Examples:
- generating due candidates after a completed visit;
- creating operational alerts;
- preparing a reminder candidate when consent and eligibility rules pass;
- scheduled data processing;
- repeatable import validation;
- retrying an idempotent synchronization task.

Automation must remain bounded and observable.

### Layer 4 — AGENTIC

Work that requires multi-step reasoning, context selection, adaptation, or orchestration rather than one deterministic rule.

Examples for future maturity:
- reviewing multiple operational signals and preparing a prioritized daily action list;
- analyzing retention patterns across several datasets;
- investigating an operational anomaly and proposing next steps;
- coordinating several tools under explicit permissions.

Agentic behavior is optional and evidence-driven.

**Do not use an agent when Systematic or Automation is sufficient.**

## 3. Layer selection rule

Use the **lowest-complexity layer that safely solves the real burden**.

Decision order:

1. Must a human perform it? → HUMAN.
2. Can deterministic software remove the burden? → SYSTEMATIC.
3. Can a clear trigger/rule execute it repeatedly? → AUTOMATION.
4. Does it require multi-step reasoning/adaptation across context? → AGENTIC.

If the answer is unclear:

→ return to OBSERVE.

## 4. Workload transfer principle

For every candidate workflow, record:

- current human workload;
- frequency;
- time/effort;
- error or forgetfulness risk;
- business impact;
- data required;
- current workaround;
- desired outcome;
- proposed layer;
- reason for the layer;
- human approval/control required;
- evidence after deployment.

The objective is not maximum automation.

The objective is **minimum unnecessary human burden**.

## 5. Anti-patterns

Do not:
- add AI because it sounds advanced;
- build an agent for a deterministic rule;
- automate a workflow before understanding it;
- replace a working human judgment without evidence;
- create duplicate data entry;
- make Kasir Pro integration a blocker when manual bridging is sufficient;
- create dashboards without an operational decision behind them;
- treat every manual step as a problem;
- optimize a workflow that is rarely used.

## 6. Success definition

A successful feature is one where a real operator can say:

> “Sebelumnya saya harus mengerjakan/mengingat/mencari/menghitung ini sendiri. Sekarang sistem menangani bagian itu, dan saya hanya melakukan bagian yang memang perlu saya lakukan.”

That is the primary product-value test.

## 7. Bosku product thesis

**Kasir Pro remains the transaction layer.**

**Bosku One System is the workload/operations layer around it.**

The system may eventually add Automation and Agentic layers, but only when real usage demonstrates that the additional layer removes meaningful workload.

## 8. Permanent design rule

Every new feature proposal must answer:

1. What real workload exists?
2. Who currently carries it?
3. Why is it burdensome?
4. What evidence shows the burden is real?
5. Which layer should own it?
6. Why is a simpler layer insufficient?
7. What human control remains?
8. How will value be measured?

If these answers are missing, the feature is not ready to build.
