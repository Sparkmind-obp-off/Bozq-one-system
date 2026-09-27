-- Phase 3: immutable import identity, optional conservative customer linkage and report provenance.
ALTER TABLE transaction_snapshot ADD COLUMN customer_id TEXT REFERENCES customer(id);
ALTER TABLE transaction_snapshot ADD COLUMN customer_name TEXT;
ALTER TABLE transaction_snapshot ADD COLUMN customer_whatsapp TEXT;
ALTER TABLE transaction_snapshot ADD COLUMN reference_text TEXT;
CREATE UNIQUE INDEX idx_transaction_external ON transaction_snapshot(branch_id, source_system, external_transaction_id) WHERE external_transaction_id IS NOT NULL;
CREATE INDEX idx_transaction_customer ON transaction_snapshot(customer_id, transaction_time);
CREATE INDEX idx_consent_latest ON customer_consent(customer_id, channel, purpose, captured_at DESC);
CREATE UNIQUE INDEX idx_reminder_customer_due ON reminder(branch_id, customer_id, due_at, channel);
