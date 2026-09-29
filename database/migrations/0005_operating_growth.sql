-- Phase 6: additive Neon-only operational metadata and bounded manual workflows.
ALTER TABLE customer ADD COLUMN notes text CHECK (notes IS NULL OR length(notes) <= 500);
CREATE TABLE growth_setting (
  branch_id text PRIMARY KEY REFERENCES branch(id),
  at_risk_days integer NOT NULL DEFAULT 45 CHECK (at_risk_days BETWEEN 1 AND 365),
  inactive_days integer NOT NULL DEFAULT 90 CHECK (inactive_days BETWEEN 2 AND 730),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (inactive_days > at_risk_days)
);
CREATE TABLE referral (
  id text PRIMARY KEY, branch_id text NOT NULL REFERENCES branch(id),
  referrer_id text NOT NULL REFERENCES customer(id), referred_id text NOT NULL UNIQUE REFERENCES customer(id),
  status text NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','verified','void')),
  reward_status text NOT NULL DEFAULT 'none' CHECK (reward_status IN ('none','eligible','redeemed')),
  recorded_by text NOT NULL REFERENCES app_user(id), recorded_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_id)
);
CREATE INDEX idx_referral_referrer ON referral(referrer_id, recorded_at DESC);
CREATE TABLE growth_campaign (
  id text PRIMARY KEY, branch_id text NOT NULL REFERENCES branch(id),
  name text NOT NULL CHECK (length(name) BETWEEN 2 AND 80),
  kind text NOT NULL CHECK (kind IN ('retention','reactivation','loyalty','referral','new_customer','seasonal')),
  audience text NOT NULL CHECK (length(audience) BETWEEN 2 AND 200),
  content text NOT NULL CHECK (length(content) BETWEEN 2 AND 500),
  consent_required boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  created_by text NOT NULL REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE growth_action (
  id text PRIMARY KEY, branch_id text NOT NULL REFERENCES branch(id),
  customer_id text NOT NULL REFERENCES customer(id), campaign_id text REFERENCES growth_campaign(id),
  kind text NOT NULL CHECK (kind IN ('follow_up','reactivate','loyalty_reward','ask_referral','record_source','update_consent')),
  reason text NOT NULL CHECK (length(reason) BETWEEN 2 AND 300),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','prepared','handoff_opened','done','dismissed')),
  outcome text CHECK (outcome IS NULL OR length(outcome) <= 300),
  created_by text NOT NULL REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK ((status IN ('done','dismissed')) = (completed_at IS NOT NULL))
);
CREATE INDEX idx_growth_action_open ON growth_action(branch_id, status, created_at DESC);
-- Serializes award/redeem for each customer. Service eligibility is explicitly configured by owner.
CREATE FUNCTION award_haircut(p_visit text, p_program text, p_actor text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE v_customer text; v_service text; v_branch text; v_required integer; v_eligible text; v_count integer; v_reward text;
BEGIN
  SELECT customer_id INTO v_customer FROM visit WHERE id = p_visit;
  IF v_customer IS NULL THEN RAISE EXCEPTION 'Customer visit required'; END IF;
  PERFORM 1 FROM customer WHERE id = v_customer FOR UPDATE;
  SELECT branch_id, eligible_visits_required, reward_service_id INTO v_branch, v_required, v_eligible FROM loyalty_program WHERE id = p_program AND active = true;
  SELECT service_id INTO v_service FROM visit WHERE id = p_visit AND customer_id = v_customer AND branch_id = v_branch AND status = 'completed';
  IF v_branch IS NULL OR v_eligible IS NULL OR v_service IS DISTINCT FROM v_eligible THEN RAISE EXCEPTION 'Visit not eligible for configured haircut'; END IF;
  IF EXISTS (SELECT 1 FROM loyalty_reward WHERE redeemed_visit_id = p_visit) THEN RAISE EXCEPTION 'Reward redemption cannot also earn credit'; END IF;
  INSERT INTO loyalty_credit(visit_id, customer_id, program_id, awarded_by) VALUES (p_visit, v_customer, p_program, p_actor) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT count(*) INTO v_count FROM loyalty_credit WHERE customer_id = v_customer AND program_id = p_program;
  IF v_count % v_required = 0 THEN
    v_reward := gen_random_uuid()::text;
    INSERT INTO loyalty_reward(id,customer_id,program_id,earned_after_visit_id) VALUES (v_reward,v_customer,p_program,p_visit);
  END IF;
  RETURN v_reward;
END $$;
CREATE FUNCTION redeem_haircut(p_reward text, p_visit text) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE v_customer text; v_program text; v_service text;
BEGIN
  SELECT customer_id INTO v_customer FROM loyalty_reward WHERE id = p_reward;
  IF v_customer IS NULL THEN RAISE EXCEPTION 'Reward not found'; END IF;
  PERFORM 1 FROM customer WHERE id = v_customer FOR UPDATE;
  SELECT program_id INTO v_program FROM loyalty_reward WHERE id = p_reward AND customer_id = v_customer AND redeemed_visit_id IS NULL;
  IF v_program IS NULL THEN RETURN false; END IF;
  SELECT reward_service_id INTO v_service FROM loyalty_program WHERE id = v_program AND active = true;
  IF NOT EXISTS (SELECT 1 FROM visit WHERE id = p_visit AND customer_id = v_customer AND status = 'completed' AND service_id = v_service) THEN RAISE EXCEPTION 'Completed eligible visit required'; END IF;
  IF EXISTS (SELECT 1 FROM loyalty_credit WHERE visit_id = p_visit AND program_id = v_program) THEN RAISE EXCEPTION 'Credit visit cannot redeem reward'; END IF;
  UPDATE loyalty_reward SET redeemed_visit_id = p_visit, redeemed_at = now() WHERE id = p_reward AND redeemed_visit_id IS NULL;
  RETURN FOUND;
END $$;
