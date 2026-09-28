# Bosku Daily Report Specification

## Problem
The operator currently has to remember the day's transactions and manually compose a WhatsApp report at night.

## Target
The system aggregates operational data during the day and prepares a reviewable daily report.

## Report Sections
- Date
- Capster/operator
- Completed services
- Service counts
- Gross operational total where data is authoritative
- Booking count
- Completed visit count
- Payment/transaction status where available
- Exceptions/missing records
- Notes

## State
GENERATED → REVIEW → CORRECT IF NEEDED → READY TO SEND → HUMAN SENDS

## Authority
Kasir Pro remains transaction authority. Bosku One System must not invent payment totals or treat projected booking value as actual revenue.

## WhatsApp
The product may prepare copy/text for WhatsApp. Autonomous sending is out of scope for this phase.

## Acceptance
At closing, operator should be able to understand the day's report without reconstructing the day from memory.
