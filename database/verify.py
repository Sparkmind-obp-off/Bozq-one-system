"""Non-destructive PostgreSQL verification: all test rows are rolled back."""
import os
import uuid
import psycopg
from psycopg.errors import ForeignKeyViolation, UniqueViolation, CheckViolation
from apply import apply

CORE = ('growth_setting', 'referral', 'growth_campaign', 'growth_action', 'business', 'branch', 'app_user', 'session', 'customer', 'visit', 'booking',
        'service', 'capster', 'customer_consent', 'sync_run', 'transaction_snapshot',
        'audit_event', 'customer_source', 'loyalty_program', 'loyalty_credit', 'loyalty_reward')


def verify(connection):
    with connection.cursor() as q:
        q.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
        assert set(CORE) <= {r[0] for r in q.fetchall()}, 'schema incomplete'
        q.execute('SELECT version FROM schema_migrations ORDER BY version')
        assert len(q.fetchall()) == 6, 'migration ledger incomplete'
        q.execute('SELECT count(*) FROM transaction_snapshot')
        actual = q.fetchone()[0]
        q.execute('SELECT count(*) FROM growth_actual_daily')
        assert (q.fetchone()[0] == 0) == (actual == 0), 'actual view consistency'
    # Explicit rollback: no test row, consent, visit or transaction persists.
    connection.rollback()
    uid = lambda: str(uuid.uuid4())
    with connection.cursor() as q:
        try:
            branch = uid(); person = uid(); capster = uid(); service = uid(); run = uid(); program = uid()
            q.execute('INSERT INTO business(id,name) VALUES (%s,%s)', (uid(), 'VERIFICATION ONLY'))
            business = q.execute('SELECT id FROM business WHERE name = %s', ('VERIFICATION ONLY',)).fetchone()[0]
            q.execute('INSERT INTO branch(id,business_id,name) VALUES (%s,%s,%s)', (branch,business,'TEST'))
            q.execute('INSERT INTO customer(id,branch_id,name) VALUES (%s,%s,%s)', (person,branch,'TEST ONLY'))
            q.execute('UPDATE customer SET name=%s WHERE id=%s', ('TEST UPDATED',person))
            assert q.execute('SELECT name FROM customer WHERE id=%s',(person,)).fetchone()[0]=='TEST UPDATED'
            q.execute('INSERT INTO capster(id,branch_id,display_name) VALUES (%s,%s,%s)',(capster,branch,'TEST'))
            q.execute('INSERT INTO service(id,branch_id,name) VALUES (%s,%s,%s)',(service,branch,'TEST'))
            q.execute('INSERT INTO price_rule(id,branch_id,service_id,price,effective_from,source) VALUES (%s,%s,%s,0,%s,%s)',(uid(),branch,service,'2026-01-01T00:00','test'))
            q.execute('INSERT INTO customer_source(id,customer_id,source_code) VALUES (%s,%s,%s)',(uid(),person,'unknown'))
            q.execute('INSERT INTO customer_consent(id,customer_id,channel,purpose,status,source) VALUES (%s,%s,%s,%s,%s,%s)',(uid(),person,'whatsapp','reminder','unknown','test'))
            q.execute('INSERT INTO loyalty_program(id,branch_id,name,eligible_visits_required,reward_service_id) VALUES (%s,%s,%s,4,%s)',(program,branch,'Four haircuts',service))
            q.execute('INSERT INTO growth_setting(branch_id,at_risk_days,inactive_days) VALUES (%s,45,90)',(branch,))
            q.execute('UPDATE customer SET notes=%s WHERE id=%s',('TEST NOTES',person))
            assert q.execute('SELECT notes FROM customer WHERE id=%s',(person,)).fetchone()[0]=='TEST NOTES'
            visit_ids=[]
            for day in (1,8,15,22):
                vid=uid();visit_ids.append(vid)
                q.execute('INSERT INTO visit(id,branch_id,customer_id,capster_id,service_id,occurred_at,status,source) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)',(vid,branch,person,capster,service,f'2026-01-{day:02d}T12:00','completed','walk_in'))
                q.execute('INSERT INTO loyalty_credit(visit_id,customer_id,program_id) VALUES (%s,%s,%s)',(vid,person,program))
            assert q.execute('SELECT count(*) FROM loyalty_credit WHERE customer_id=%s',(person,)).fetchone()[0]==4
            reward=uid()
            q.execute('INSERT INTO loyalty_reward(id,customer_id,program_id,earned_after_visit_id) VALUES (%s,%s,%s,%s)',(reward,person,program,visit_ids[-1]))
            redeemed=uid()
            q.execute('INSERT INTO visit(id,branch_id,customer_id,occurred_at,status,source) VALUES (%s,%s,%s,%s,%s,%s)',(redeemed,branch,person,'2026-01-29T12:00','completed','walk_in'))
            q.execute('UPDATE loyalty_reward SET redeemed_visit_id=%s,redeemed_at=now() WHERE id=%s',(redeemed,reward))
            assert q.execute('SELECT count(*) FROM loyalty_reward WHERE customer_id=%s AND redeemed_visit_id IS NOT NULL',(person,)).fetchone()[0]==1
            q.execute('INSERT INTO sync_run(id,branch_id,source_system,source_type,status) VALUES (%s,%s,%s,%s,%s)',(run,branch,'kasir_pro','csv','completed'))
            q.execute('INSERT INTO transaction_snapshot(id,branch_id,customer_id,visit_id,sync_run_id,transaction_time,gross_amount,service_text,capster_text,source_system,raw_fingerprint) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',(uid(),branch,person,visit_ids[0],run,'2026-01-01T12:00',25000,'TEST SERVICE','TEST CAPSTER','kasir_pro',uid()))
            assert q.execute('SELECT actual_revenue FROM growth_actual_daily WHERE branch_id=%s',(branch,)).fetchone()[0]==25000
            assert q.execute('SELECT sum(gross_amount) FROM transaction_snapshot WHERE branch_id=%s AND transaction_time >= %s AND transaction_time < %s',(branch,'2026-01-01','2026-01-08')).fetchone()[0]==25000
            assert q.execute('SELECT actual_revenue FROM growth_actual_service WHERE branch_id=%s',(branch,)).fetchone()[0]==25000
            assert q.execute('SELECT actual_revenue FROM growth_actual_capster WHERE branch_id=%s',(branch,)).fetchone()[0]==25000
            assert q.execute('SELECT count(*) FROM customer_source WHERE customer_id=%s',(person,)).fetchone()[0]==1
            assert q.execute('SELECT count(DISTINCT customer_id) FROM visit WHERE branch_id=%s AND status=%s',(branch,'completed')).fetchone()[0]==1
            assert q.execute('SELECT count(*) FROM visit WHERE customer_id=%s',(person,)).fetchone()[0]==5
            other=uid()
            q.execute('INSERT INTO customer(id,branch_id,name) VALUES (%s,%s,%s)',(other,branch,'TEST REFERRED'))
            campaign=uid()
            # The FK actor must be a real user; test account only lives inside this rolled-back transaction.
            account=uid()
            q.execute('INSERT INTO app_user(id,business_id,display_name,username,password_hash,role) VALUES (%s,%s,%s,%s,%s,%s)',(account,business,'TEST OPERATOR',uid(),'test-only','operator'))
            q.execute('INSERT INTO referral(id,branch_id,referrer_id,referred_id,recorded_by) VALUES (%s,%s,%s,%s,%s)',(uid(),branch,person,other,account))
            q.execute('INSERT INTO growth_campaign(id,branch_id,name,kind,audience,content,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s)',(campaign,branch,'TEST CAMPAIGN','retention','Known customers','No automatic send',account))
            q.execute('INSERT INTO growth_action(id,branch_id,customer_id,campaign_id,kind,reason,created_by) VALUES (%s,%s,%s,%s,%s,%s,%s)',(uid(),branch,person,campaign,'follow_up','Manual review',account))
            second_program=uid()
            q.execute('INSERT INTO loyalty_program(id,branch_id,name,eligible_visits_required,reward_service_id) VALUES (%s,%s,%s,4,%s)',(second_program,branch,'Test isolated loyalty',service))
            credit_visits=[]
            for number in range(4):
                vid=uid(); credit_visits.append(vid)
                q.execute('INSERT INTO visit(id,branch_id,customer_id,service_id,occurred_at,status,source) VALUES (%s,%s,%s,%s,%s,%s,%s)',(vid,branch,other,service,'2026-02-01T10:00','completed','walk_in'))
                earned=q.execute('SELECT award_haircut(%s,%s,%s)',(vid,second_program,account)).fetchone()[0]
                assert bool(earned)==(number==3)
            assert q.execute('SELECT award_haircut(%s,%s,%s)',(credit_visits[0],second_program,account)).fetchone()[0] is None
            redemption_visit=uid()
            q.execute('INSERT INTO visit(id,branch_id,customer_id,service_id,occurred_at,status,source) VALUES (%s,%s,%s,%s,%s,%s,%s)',(redemption_visit,branch,other,service,'2026-02-02T10:00','completed','walk_in'))
            assert q.execute('SELECT redeem_haircut(%s,%s)',(earned,redemption_visit)).fetchone()[0] is True
            assert q.execute('SELECT redeem_haircut(%s,%s)',(earned,redemption_visit)).fetchone()[0] is False
            # Every invalid attempt runs in a savepoint; expected failures do not poison the test transaction.
            for query, params, exception in (
                ('INSERT INTO visit(id,branch_id,customer_id,occurred_at,status,source) VALUES (%s,%s,%s,%s,%s,%s)',(uid(),branch,uid(),'2026-01-01T12:00','completed','walk_in'),ForeignKeyViolation),
                ('INSERT INTO loyalty_credit(visit_id,customer_id,program_id) VALUES (%s,%s,%s)',(visit_ids[0],person,program),UniqueViolation),
                ('INSERT INTO loyalty_reward(id,customer_id,program_id,earned_after_visit_id,redeemed_visit_id,redeemed_at) VALUES (%s,%s,%s,%s,%s,now())',(uid(),person,program,visit_ids[-1],redeemed),UniqueViolation),
                ('INSERT INTO customer_consent(id,customer_id,channel,purpose,status,source) VALUES (%s,%s,%s,%s,%s,%s)',(uid(),person,'whatsapp','reminder','invalid','test'),CheckViolation),
            ):
                try:
                    with connection.transaction():
                        q.execute(query,params)
                except exception:
                    pass
                else:
                    raise AssertionError('Constraint was not enforced')
            q.execute('DELETE FROM customer_source WHERE customer_id=%s',(person,))
            assert q.execute('SELECT count(*) FROM customer_source WHERE customer_id=%s',(person,)).fetchone()[0]==0
        finally:
            connection.rollback()
    return {'schema':'PASS','CRUD':'PASS','constraints':'PASS','relationships':'PASS','analytics':'PASS','rollback':'PASS'}


if __name__ == '__main__':
    if not os.environ.get('DATABASE_URL'):
        raise SystemExit('DATABASE_CREDENTIALS_REQUIRED')
    with psycopg.connect(os.environ['DATABASE_URL'],connect_timeout=15) as conn:
        result=verify(conn)
    print(result)
