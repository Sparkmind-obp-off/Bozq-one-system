"""Apply reviewed PostgreSQL migrations transactionally. DATABASE_URL is supplied externally."""
import hashlib
import os
from pathlib import Path
import psycopg

MIGRATIONS = Path(__file__).parent / 'migrations'


def apply(connection):
    files = sorted(MIGRATIONS.glob('[0-9][0-9][0-9][0-9]_*.sql'))
    if not files:
        raise RuntimeError('No PostgreSQL migrations found')
    with connection.transaction():
        with connection.cursor() as cur:
            cur.execute('SELECT pg_advisory_xact_lock(5115005)')
            cur.execute("SELECT to_regclass('public.schema_migrations')")
            if cur.fetchone()[0] is None:
                cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'")
                existing = {row[0] for row in cur.fetchall()}
                # Neon creates this unrelated sample table by default; preserve it untouched.
                if existing - {'playing_with_neon'}:
                    raise RuntimeError('Target has unexpected tables and no migration ledger')
                cur.execute('CREATE TABLE public.schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())')
            cur.execute('SELECT version, checksum FROM public.schema_migrations')
            applied = dict(cur.fetchall())
            known = {file.stem for file in files}
            if set(applied) - known:
                raise RuntimeError('Target has unknown migrations; refusing to modify')
            completed = []
            for file in files:
                sql = file.read_text(encoding='utf-8')
                digest = hashlib.sha256(sql.encode()).hexdigest()
                if file.stem in applied:
                    if applied[file.stem] != digest:
                        raise RuntimeError('Migration checksum mismatch: ' + file.name)
                    continue
                cur.execute(sql)
                cur.execute('INSERT INTO public.schema_migrations (version, checksum) VALUES (%s, %s)', (file.stem, digest))
                completed.append(file.name)
            return completed


if __name__ == '__main__':
    url = os.environ.get('DATABASE_URL')
    if not url:
        raise SystemExit('DATABASE_CREDENTIALS_REQUIRED')
    with psycopg.connect(url, connect_timeout=15) as conn:
        completed = apply(conn)
    print('Migrations applied:', ', '.join(completed) if completed else 'none (already current)')
