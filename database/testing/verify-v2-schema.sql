\set ON_ERROR_STOP on

DO $$
BEGIN
  IF current_database() = 'elections2026' OR current_database() !~ '(test|local)' THEN
    RAISE EXCEPTION 'Refusing unsafe database %', current_database();
  END IF;
  IF host(inet_server_addr()) <> '127.0.0.1' THEN
    RAISE EXCEPTION 'Refusing non-local server %:%', inet_server_addr(), inet_server_port();
  END IF;
END $$;

SELECT
  current_database() AS database_name,
  current_user AS user_name,
  inet_server_addr() AS server_addr,
  inet_server_port() AS server_port;

SELECT COUNT(*) AS elections_v2_table_count
FROM information_schema.tables
WHERE table_schema = 'elections_v2'
  AND table_type = 'BASE TABLE';

SELECT table_name, COUNT(*) AS duplicate_count
FROM information_schema.tables
WHERE table_schema = 'elections_v2'
  AND table_type = 'BASE TABLE'
GROUP BY table_name
HAVING COUNT(*) > 1;

SELECT c.conrelid::regclass::text AS table_name, c.conname, COUNT(*) AS duplicate_count
FROM pg_constraint c
JOIN pg_namespace n ON n.oid = c.connamespace
WHERE n.nspname = 'elections_v2'
GROUP BY c.conrelid::regclass::text, c.conname
HAVING COUNT(*) > 1;

SELECT schemaname, indexname, COUNT(*) AS duplicate_count
FROM pg_indexes
WHERE schemaname = 'elections_v2'
GROUP BY schemaname, indexname
HAVING COUNT(*) > 1;

SELECT n.nspname, c.relkind, COUNT(*) AS object_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'i')
GROUP BY n.nspname, c.relkind
ORDER BY c.relkind;

SELECT 'historical_tables_visibility_only' AS check_name, table_name, status
FROM (
  VALUES ('results_votes'), ('results_department')
) AS expected(table_name)
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'elections_v2'
        AND table_name = expected.table_name
    )
    THEN 'unexpected_in_target'
    ELSE 'not_present_in_target'
  END AS status
) AS result;
