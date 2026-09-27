-- Phase 2: distinguish selected services and each person in a booking.
ALTER TABLE service ADD COLUMN updated_at TEXT;
ALTER TABLE visit ADD COLUMN service_id TEXT REFERENCES service(id);
-- Caller-generated UUIDs plus canonical request hashes allow safe create retries.
ALTER TABLE visit ADD COLUMN request_hash TEXT;
ALTER TABLE booking ADD COLUMN request_hash TEXT;
ALTER TABLE customer ADD COLUMN request_hash TEXT;
CREATE TABLE booking_person (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES booking(id),
  customer_id TEXT REFERENCES customer(id),
  service_id TEXT REFERENCES service(id),
  capster_id TEXT REFERENCES capster(id),
  projected_unit_value INTEGER CHECK(projected_unit_value >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE visit ADD COLUMN booking_person_id TEXT REFERENCES booking_person(id);
CREATE UNIQUE INDEX idx_visit_booking_person ON visit(booking_person_id) WHERE booking_person_id IS NOT NULL;
CREATE INDEX idx_booking_person_booking ON booking_person(booking_id);
CREATE INDEX idx_booking_branch_schedule ON booking(branch_id, scheduled_start);
CREATE INDEX idx_visit_branch_time ON visit(branch_id, occurred_at);
CREATE INDEX idx_price_rule_service_from ON price_rule(service_id, effective_from DESC);
