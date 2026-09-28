# Bosku Booking & Arrival Visibility

## Current Reality
Bookings commonly arrive through WhatsApp and may remain in memory or chat. Multiple arrivals can create waiting, confusion, or customer drop-off.

## Systematic Goal
Make today's booking and arrival context visible without requiring the operator to remember it.

## Minimum Record
- Customer
- Contact when available
- Date
- Time
- Service
- Status
- Notes

## Statuses
BOOKED → ARRIVED → IN_SERVICE → COMPLETED
Alternative outcomes:
CANCELLED / NO_SHOW

## Multiple Arrivals
The system should preserve order/context and show who is currently being served or waiting.

## Important Constraint
Do not build a complex queue-management product yet. First make the existing booking/arrival state visible, then observe whether customer drop-off remains material.

## Future Automation Candidate
Reminder preparation may be automated after consent and eligibility rules are satisfied. Sending remains human-controlled.
