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

  // SQL that has no $N but uses `?` placeholders (the store builds queries that
  // way) maps values 1:1 — pass them through. Without this, `?`-style queries
  // with values lost every value (the $N replace never fired), so `stmt.run()`
  // got zero params → "Too few parameter values were provided". SQL with neither
  // placeholder style drops the (unused) values to avoid "too many parameters".
  if (!/\$\d+/.test(text)) {
    return { text, values: text.includes('?') ? values : [] }
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
 * - `DEFAULT gen_random_uuid()` → `DEFAULT (lower(hex(randomblob(16))))`, the
 *   SQLite equivalent random-id default. Resource handlers set `id = id || uuid()`
 *   so they don't need it, but a custom handler using the bare `create('t', {…})`
 *   (no explicit id — the documented pattern) DOES rely on the column default;
 *   stripping it left `id … NOT NULL` with no default, so every such insert hit
 *   `NOT NULL constraint failed: t.id`. Translating (not stripping) keeps both
 *   paths working: resource handlers pass an id that overrides the default, custom
 *   handlers get one generated.
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
    .replace(/DEFAULT\s+gen_random_uuid\(\)/gi, 'DEFAULT (lower(hex(randomblob(16))))')
    .replace(/\bnow\(\)/gi, 'current_timestamp')
    .replace(/::[a-z_]+/gi, '')
    .replace(/\s+USING\s+(gin|btree|hash|gist)\b/gi, '')

/**
 * Coerce a JS value into something better-sqlite3 can bind. better-sqlite3 only
 * accepts numbers, strings, bigints, buffers, and null — a JS boolean, plain
 * object, array, `undefined`, or `Date` throws at bind time, which would crash
 * every `create()`/`update()` that passes a `boolean` or `jsonb` value (e.g.
 * `users.twoFactorEnabled`, `projects.packages`). Mirrors what the Postgres
 * driver accepts: booleans → 0/1, objects/arrays → JSON text, Date → ISO string,
 * `undefined` → null.
 *
 * @param value - The value to bind.
 * @returns A better-sqlite3-bindable primitive.
 */
export const coerceSqliteParam = (value: unknown): unknown => {
  if (value === undefined || value === null) return null
  if (typeof value === 'boolean') return value ? 1 : 0
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'string')
    return value
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Uint8Array) return value // covers Buffer
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

/** Minimal shape of better-sqlite3's `Statement.columns()` entries we use. */
export interface SqliteColumnMeta {
  name: string
  type: string | null
}

/**
 * Normalize a SQLite result set back to JS types using the declared column types,
 * so values round-trip like the Postgres bond instead of leaking SQLite's storage
 * form: a `BOOLEAN` column's 0/1 → boolean, a `JSON`/`JSONB` column's text →
 * parsed value. Columns with an unknown/expression type (null) and values that
 * aren't in storage form pass through untouched. Mutates rows in place for speed.
 *
 * @param rows - Raw rows from `stmt.all()`.
 * @param columns - `stmt.columns()` metadata for the result set.
 * @returns The normalized rows.
 */
export const normalizeSqliteRows = <T>(
  rows: Record<string, unknown>[],
  columns: SqliteColumnMeta[],
): T[] => {
  const boolCols: string[] = []
  const jsonCols: string[] = []
  for (const c of columns) {
    const t = (c.type ?? '').toUpperCase()
    if (t === 'BOOLEAN' || t === 'BOOL') boolCols.push(c.name)
    else if (t === 'JSON' || t === 'JSONB') jsonCols.push(c.name)
  }
  if (boolCols.length === 0 && jsonCols.length === 0) return rows as T[]
  for (const row of rows) {
    for (const name of boolCols) {
      if (typeof row[name] === 'number') row[name] = row[name] !== 0
    }
    for (const name of jsonCols) {
      if (typeof row[name] === 'string') {
        try {
          row[name] = JSON.parse(row[name] as string)
        } catch (_error) {
          // leave the raw string if it isn't valid JSON
        }
      }
    }
  }
  return rows as T[]
}
