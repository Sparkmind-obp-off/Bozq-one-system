-- Minimal traceable growth layer. No automatic consent, credits, rewards, or acquisitions are invented.
CREATE TABLE customer_source (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customer(id),
  source_code text NOT NULL CHECK(source_code IN ('walk_in','whatsapp','referral','google','instagram','tiktok','existing','other','unknown')),
  evidence text,
  observed_by text REFERENCES app_user(id),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_source_recent ON customer_source(customer_id, recorded_at DESC);

CREATE TABLE loyalty_program (
  id text PRIMARY KEY,
  branch_id text NOT NULL REFERENCES branch(id),
  name text NOT NULL,
  eligible_visits_required integer NOT NULL CHECK(eligible_visits_required > 0),
  reward_service_id text REFERENCES service(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Credits are granted only for reviewed eligible completed visits. An actual visit cannot earn twice.
ALTER TABLE visit ADD CONSTRAINT uq_visit_customer UNIQUE(id, customer_id);
CREATE TABLE loyalty_credit (
  visit_id text NOT NULL,
  customer_id text NOT NULL,
  program_id text NOT NULL REFERENCES loyalty_program(id),
  awarded_by text REFERENCES app_user(id),
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visit_id, program_id),
  UNIQUE (visit_id, customer_id, program_id),
  FOREIGN KEY (visit_id, customer_id) REFERENCES visit(id, customer_id)
);
CREATE INDEX idx_loyalty_credit_customer ON loyalty_credit(customer_id, program_id);
CREATE TABLE loyalty_reward (
  id text PRIMARY KEY,
  customer_id text NOT NULL REFERENCES customer(id),
  program_id text NOT NULL REFERENCES loyalty_program(id),
  earned_after_visit_id text NOT NULL,
  redeemed_visit_id text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  redeemed_at timestamptz,
  UNIQUE (program_id, earned_after_visit_id),
  UNIQUE (redeemed_visit_id),
  FOREIGN KEY (earned_after_visit_id, customer_id, program_id) REFERENCES loyalty_credit(visit_id, customer_id, program_id),
  FOREIGN KEY (redeemed_visit_id, customer_id) REFERENCES visit(id, customer_id),
  CHECK ((redeemed_visit_id IS NULL AND redeemed_at IS NULL) OR (redeemed_visit_id IS NOT NULL AND redeemed_at IS NOT NULL))
);
CREATE INDEX idx_loyalty_reward_customer ON loyalty_reward(customer_id, program_id);

-- Imported and verified Kasir Pro snapshots only; no booking/visit projection contributes to revenue.
CREATE VIEW growth_actual_daily AS
SELECT branch_id, substring(transaction_time from 1 for 10) AS business_date,
       count(*) AS transaction_count, sum(gross_amount) AS actual_revenue
FROM transaction_snapshot
WHERE source_system = 'kasir_pro' AND reconciliation_status <> 'conflict' AND gross_amount IS NOT NULL
GROUP BY branch_id, substring(transaction_time from 1 for 10);
CREATE VIEW growth_actual_service AS
SELECT branch_id, service_text, count(*) AS transaction_count, sum(gross_amount) AS actual_revenue
FROM transaction_snapshot
WHERE source_system = 'kasir_pro' AND reconciliation_status <> 'conflict' AND gross_amount IS NOT NULL
GROUP BY branch_id, service_text;
CREATE VIEW growth_actual_capster AS
SELECT branch_id, capster_text, count(*) AS transaction_count, sum(gross_amount) AS actual_revenue
FROM transaction_snapshot
WHERE source_system = 'kasir_pro' AND reconciliation_status <> 'conflict' AND gross_amount IS NOT NULL
GROUP BY branch_id, capster_text;
