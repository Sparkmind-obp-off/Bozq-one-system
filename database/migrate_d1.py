"""Copy an offline, private D1 SQL export into verified Neon target without deleting source.

Usage: DATABASE_URL=... python database/migrate_d1.py /absolute/private/d1-export.sql
The export must remain outside the repository. Never log row contents or credentials.
"""
import os
import sqlite3
import sys
from pathlib import Path
import psycopg
from psycopg import sql

TABLES = (
    'business', 'branch', 'app_user', 'session', 'capster', 'customer',
    'customer_consent', 'service', 'price_rule', 'booking', 'booking_person',
    'visit', 'sync_run', 'transaction_snapshot', 'reminder', 'reminder_event',
    'audit_event', 'd1_migrations',
)


def migrate(source_path: Path, target):
    source = sqlite3.connect(':memory:')
    source.row_factory = sqlite3.Row
    source.executescript(source_path.read_text(encoding='utf-8'))
    problems = source.execute('PRAGMA foreign_key_check').fetchall()
    if problems:
        raise RuntimeError('Source D1 foreign key check failed')
    counts = {}
    # All operations are one PostgreSQL transaction. Do not update existing business records.
    with target.transaction():
        with target.cursor() as cur:
            cur.execute('SELECT pg_advisory_xact_lock(5115006)')
            for table in TABLES:
                destination_table = 'd1_migration_history' if table == 'd1_migrations' else table
                columns = [item['name'] for item in source.execute(f'PRAGMA table_info("{table}")')]
                cur.execute('SELECT column_name FROM information_schema.columns WHERE table_schema = %s AND table_name = %s', ('public', destination_table))
                destination = {item[0] for item in cur.fetchall()}
                if not set(columns).issubset(destination):
                    raise RuntimeError('Destination column mismatch in ' + table)
                order = ' ORDER BY rowid' if table == 'customer_consent' else ''
                rows = source.execute(f'SELECT * FROM "{table}"{order}').fetchall()
                cur.execute(sql.SQL('SELECT count(*) FROM public.{}').format(sql.Identifier(destination_table)))
                target_count = cur.fetchone()[0]
                # Repeat runs verify equality; never silently overwrite or discard target rows.
                if target_count:
                    if target_count != len(rows):
                        raise RuntimeError('Target count mismatch in ' + table)
                    for row in rows:
                        pk = 'token_hash' if table == 'session' else 'id'
                        cur.execute(sql.SQL('SELECT {} FROM public.{} WHERE {} = %s').format(
                            sql.SQL(', ').join(map(sql.Identifier, columns)), sql.Identifier(destination_table), sql.Identifier(pk)), (row[pk],))
                        actual = cur.fetchone()
                        if actual is None or tuple(row[col] for col in columns) != tuple(actual):
                            raise RuntimeError('Target record mismatch in ' + table)
                else:
                    insert = sql.SQL('INSERT INTO public.{} ({}) VALUES ({})').format(
                        sql.Identifier(destination_table), sql.SQL(', ').join(map(sql.Identifier, columns)),
                        sql.SQL(', ').join(sql.Placeholder() for _ in columns))
                    for row in rows:
                        cur.execute(insert, tuple(row[col] for col in columns))
                counts[destination_table] = len(rows)
            for table, expected in counts.items():
                cur.execute(sql.SQL('SELECT count(*) FROM public.{}').format(sql.Identifier(table)))
                if cur.fetchone()[0] != expected:
                    raise RuntimeError('Post-migration count mismatch in ' + table)
    source.close()
    return counts


if __name__ == '__main__':
    if not os.environ.get('DATABASE_URL'):
        raise SystemExit('DATABASE_CREDENTIALS_REQUIRED')
    if len(sys.argv) != 2 or not Path(sys.argv[1]).is_absolute():
        raise SystemExit('Private absolute D1 export path required')
    try:
        with psycopg.connect(os.environ['DATABASE_URL'], connect_timeout=15) as connection:
            result = migrate(Path(sys.argv[1]), connection)
        print('D1_TO_NEON_COUNTS:', result)
    except Exception as exc:
        print('D1_TO_NEON_FAILED:', type(exc).__name__, 'SQLSTATE:', getattr(exc, 'sqlstate', None))
        raise SystemExit(1) from None
