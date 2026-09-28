# Bosku Systematic Acceptance Criteria

## Objective
The Systematic layer is successful when the operator no longer needs to carry predictable administrative information in memory.

## Acceptance Criteria

### Memory
- Today's bookings are visible.
- Customer history is searchable.
- Service and price information is searchable.
- Daily totals are derived from recorded data.

### Reporting
- Daily report can be generated without reconstructing the day manually.
- Report clearly separates actual/authoritative data from projections.
- Missing or inconsistent records are visible.

### Service
- Service completion can be recorded quickly.
- Payment state is distinct from service state.
- Receipt-print failure does not erase service state.

### Documentation
- Photo/documentation status is visible.
- Missed documentation can be identified without blocking normal service.

### Readiness
- Opening checklist is available.
- Basic missing-stock/readiness issues can be recorded.

### Booking
- Booking list is visible.
- Arrival/service state is visible.
- Multiple arrivals do not depend entirely on memory.

### UX
- Mobile-first.
- Fast to use during real work.
- Minimal typing.
- Works acceptably on weak connections.
- No unnecessary AI interaction for deterministic tasks.

## Stop Rule
Do not expand into Automation or Agentic work until real usage demonstrates that the Systematic layer is insufficient for a specific workload.
