/**
 * Utility functions for SQLite operations.
 *
 * @module
 */

/**
 * Convert PostgreSQL-style positional placeholders ($1, $2, ...) to SQLite-style (?) placeholders.
 * Also reorders values array to match the placeholder order.
 *
 * @param text - SQL query text with $N placeholders.
 * @param values - Parameter values ordered by $N index.
 * @returns The query text with ? placeholders and reordered values.
 */
export const convertPlaceholders = (
  text: string,
  values?: unknown[],
): { text: string; values: unknown[] } => {
  if (!values || values.length === 0) {
    return { text: text.replace(/\$(\d+)/g, '?'), values: [] }
  }

  const reorderedValues: unknown[] = []
  const convertedText = text.replace(/\$(\d+)/g, (_, num) => {
    const index = parseInt(num, 10) - 1
    reorderedValues.push(values[index])
    return '?'
  })

  return { text: convertedText, values: reorderedValues }
}

/**
 * Translate PostgreSQL-dialect DDL to SQLite-compatible DDL at migration time.
 *
 * Resource/template setup migrations are authored in PostgreSQL dialect, but a
 * SQLite project applies them raw via the migrator's `db.exec()`. SQLite
 * tolerates Postgres *type* names through affinity (`uuid`, `timestamptz`,
 * `jsonb`, `boolean`), but it rejects Postgres *function/cast/index* SYNTAX,
 * which raises `near "(": syntax error` and aborts the whole migration. This
 * rewrites the handful of constructs that actually appear across the resource
 * library so those migrations apply on SQLite:
 *
 * - `DEFAULT gen_random_uuid()` → removed. The resource layer always sets
 *   `id = id || uuid()` on create, so the column never relies on a DB default.
 * - `now()` / `NOW()` → `current_timestamp` (a SQLite keyword).
 * - `::type` casts (e.g. `'{}'::jsonb`) → removed (Postgres-only syntax).
 * - `USING <method>` on an index (`gin`/`btree`/`hash`/`gist`) → removed
 *   (SQLite indexes have no access method).
 *
 * These are no-ops on already-SQLite DDL (the executor's own migrations don't use
 * them), so it is safe to run on every migration file.
 *
 * @param sql - Raw migration SQL, possibly in Postgres dialect.
 * @returns SQLite-compatible SQL.
 */
export const translateDdlToSqlite = (sql: string): string =>
  sql
    .replace(/\s+DEFAULT\s+gen_random_uuid\(\)/gi, '')
    .replace(/\bnow\(\)/gi, 'current_timestamp')
    .replace(/::[a-z_]+/gi, '')
    .replace(/\s+USING\s+(gin|btree|hash|gist)\b/gi, '')
