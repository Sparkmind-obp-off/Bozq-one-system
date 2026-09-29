-- Preserve D1 migration lineage as read-only source provenance, separate from Neon schema_migrations.
CREATE TABLE d1_migration_history (
  id integer PRIMARY KEY,
  name text NOT NULL UNIQUE,
  applied_at text NOT NULL
);
